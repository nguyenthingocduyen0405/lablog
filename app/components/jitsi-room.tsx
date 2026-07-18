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

export default function JitsiRoom({ roomName, userName, userEmail, title, isHost, notes, notesStatus, onNotesChange, onClose, onEnd }: { roomName: string; userName: string; userEmail: string; title: string; isHost: boolean; notes: string; notesStatus: "saved" | "saving" | "error"; onNotesChange: (notes: string) => void; onClose: () => void; onEnd: () => void | Promise<void> }) {
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
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(18rem,1fr)_minmax(15rem,40vh)] md:grid-cols-[minmax(0,1fr)_22rem] md:grid-rows-1">
        <div className="relative min-h-0">
          {status && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/50">{status}</p>}
          <div ref={roomRef} className="absolute inset-0" />
        </div>
        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#171713] p-4 md:border-l md:border-t-0 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd84d]">MEETING NOTES</p><h3 className="mt-1 text-lg font-black">회의 내용 정리</h3></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${notesStatus === "error" ? "bg-red-400/15 text-red-300" : notesStatus === "saving" ? "bg-[#ffd84d]/15 text-[#ffd84d]" : "bg-emerald-300/15 text-emerald-300"}`}>{notesStatus === "error" ? "저장 실패" : notesStatus === "saving" ? "저장 중…" : "자동 저장됨"}</span></div>
          <p className="mt-3 text-xs font-semibold leading-5 text-white/40">핵심 논의, 결정 사항, 다음 할 일을 함께 적어 주세요. 회의 종료 후 팀 기록으로 보관돼요.</p>
          <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} maxLength={20000} aria-label="회의 내용 정리" placeholder={"핵심 논의\n- \n\n결정 사항\n- \n\n다음 할 일\n- 담당자 / deadline"} className="mt-4 min-h-0 flex-1 resize-none rounded-2xl bg-white/[0.07] p-4 text-sm font-semibold leading-6 text-white outline-none ring-1 ring-white/10 placeholder:text-white/20 focus:ring-2 focus:ring-[#ffd84d]" />
          <p className="mt-2 text-right text-[10px] font-bold text-white/25">{notes.length.toLocaleString()} / 20,000</p>
        </aside>
      </div>
    </div>
  );
}
