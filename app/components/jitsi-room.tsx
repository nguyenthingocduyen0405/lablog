"use client";

import { useEffect, useRef, useState } from "react";

type JitsiApi = {
  dispose: () => void;
  addListener: (event: string, listener: () => void) => void;
};

type JitsiConstructor = new (domain: string, options: {
  roomName: string;
  parentNode: HTMLElement;
  width: string;
  height: string;
  lang: string;
  userInfo: { displayName: string; email: string };
  configOverwrite: Record<string, unknown>;
}) => JitsiApi;

declare global {
  interface Window { JitsiMeetExternalAPI?: JitsiConstructor }
}

export default function JitsiRoom({ roomName, userName, userEmail, title, isHost, onClose, onEnd }: { roomName: string; userName: string; userEmail: string; title: string; isHost: boolean; onClose: () => void; onEnd: () => void | Promise<void> }) {
  const roomRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onEndRef = useRef(onEnd);
  const [status, setStatus] = useState("화상 회의를 준비하고 있어요...");

  useEffect(() => {
    onCloseRef.current = onClose;
    onEndRef.current = onEnd;
  }, [onClose, onEnd]);

  useEffect(() => {
    let disposed = false;
    let api: JitsiApi | null = null;

    const mountMeeting = () => {
      if (disposed || !roomRef.current || !window.JitsiMeetExternalAPI) return;
      roomRef.current.replaceChildren();
      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: roomRef.current,
        width: "100%",
        height: "100%",
        lang: "ko",
        userInfo: { displayName: userName, email: userEmail },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinConfig: { enabled: true },
          disableThirdPartyRequests: true,
        },
      });
      const iframe = roomRef.current.querySelector("iframe");
      if (iframe) {
        iframe.setAttribute("allow", "camera; microphone; display-capture; autoplay; clipboard-write; fullscreen");
        iframe.setAttribute("allowfullscreen", "true");
      }
      api.addListener("videoConferenceJoined", () => setStatus("회의에 참여했어요."));
      api.addListener("readyToClose", () => { if (isHost) void onEndRef.current(); else onCloseRef.current(); });
      setStatus("");
    };

    if (window.JitsiMeetExternalAPI) {
      mountMeeting();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi-api="true"]');
      const script = existing ?? document.createElement("script");
      script.addEventListener("load", mountMeeting, { once: true });
      script.addEventListener("error", () => setStatus("회의 서비스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."), { once: true });
      if (!existing) {
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.dataset.jitsiApi = "true";
        document.head.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      api?.dispose();
    };
  }, [isHost, roomName, userEmail, userName]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="meeting-room-title" className="fixed inset-0 z-[100] flex flex-col bg-[#0d0d0b] text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ffd84d]">LIVE MEETING</p><h2 id="meeting-room-title" className="truncate text-lg font-black">{title}</h2></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => window.open(`https://meet.jit.si/${roomName}`, "_blank", "noopener,noreferrer")} className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/65 hover:bg-white/20">카메라 문제 시 새 창</button><button type="button" onClick={() => { if (isHost) void onEnd(); else onClose(); }} className={`rounded-full px-4 py-2 text-xs font-black ${isHost ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20"}`}>{isHost ? "회의 종료" : "회의 나가기"}</button></div>
      </header>
      <div className="relative min-h-0 flex-1">
        {status && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/50">{status}</p>}
        <div ref={roomRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
