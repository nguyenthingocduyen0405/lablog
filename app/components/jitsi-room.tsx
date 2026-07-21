"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";

type JitsiApi = {
  dispose: () => void;
  addListener: (event: string, listener: () => void) => void;
};
type JitsiConstructor = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    width: string;
    height: string;
    lang: string;
    jwt: string;
    userInfo: { displayName: string; email: string };
    configOverwrite: Record<string, unknown>;
  },
) => JitsiApi;
type JitsiTokenResponse = {
  jwt: string;
  domain: string;
  appId: string;
  roomName: string;
  error?: string;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiConstructor;
  }
}

function loadJitsiApi(source: string) {
  return new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>(
      'script[data-jitsi-api="true"]',
    );
    if (
      current?.dataset.jitsiApiSource === source &&
      window.JitsiMeetExternalAPI
    ) {
      resolve();
      return;
    }
    if (current && current.dataset.jitsiApiSource !== source) {
      current.remove();
      window.JitsiMeetExternalAPI = undefined;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-jitsi-api-source="${source}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.addEventListener(
      "load",
      () =>
        window.JitsiMeetExternalAPI
          ? resolve()
          : reject(new Error("Jitsi API unavailable")),
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error("Jitsi API failed to load")),
      { once: true },
    );
    if (!existing) {
      script.src = source;
      script.async = true;
      script.dataset.jitsiApi = "true";
      script.dataset.jitsiApiSource = source;
      document.head.appendChild(script);
    }
  });
}

export default function JitsiRoom({
  roomName,
  userName,
  userEmail,
  title,
  isHost,
  notes,
  notesStatus,
  onNotesChange,
  onClose,
  onEnd,
}: {
  roomName: string;
  userName: string;
  userEmail: string;
  title: string;
  isHost: boolean;
  notes: string;
  notesStatus: "saved" | "saving" | "error";
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onEnd: () => void | Promise<void>;
}) {
  const { locale, l } = useI18n();
  const roomRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onEndRef = useRef(onEnd);
  const [status, setStatus] = useState(() =>
    l(
      "Lablog 계정으로 회의를 인증하고 있어요...",
      "Đang xác thực cuộc họp bằng tài khoản Lablog...",
      "Authenticating the meeting with your Lablog account...",
    ),
  );
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
    onEndRef.current = onEnd;
  }, [onClose, onEnd]);

  useEffect(() => {
    let disposed = false;
    let api: JitsiApi | null = null;
    const controller = new AbortController();

    async function mountMeeting() {
      try {
        const response = await fetch("/api/meetings/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
          signal: controller.signal,
        });
        const config = (await response.json()) as JitsiTokenResponse;
        if (!response.ok)
          throw new Error(config.error || "Meeting authentication failed");
        if (disposed) return;
        const scriptSource = `https://${config.domain}/${config.appId}/external_api.js`;
        await loadJitsiApi(scriptSource);
        if (disposed || !roomRef.current || !window.JitsiMeetExternalAPI)
          return;
        roomRef.current.replaceChildren();
        setExternalUrl(
          `https://${config.domain}/${config.roomName}?jwt=${encodeURIComponent(config.jwt)}`,
        );
        api = new window.JitsiMeetExternalAPI(config.domain, {
          roomName: config.roomName,
          parentNode: roomRef.current,
          width: "100%",
          height: "100%",
          lang: locale,
          jwt: config.jwt,
          userInfo: { displayName: userName, email: userEmail },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinConfig: { enabled: false },
            disableThirdPartyRequests: true,
            brandingRoomAlias: roomName,
          },
        });
        const iframe = roomRef.current.querySelector("iframe");
        if (iframe) {
          iframe.setAttribute(
            "allow",
            "camera; microphone; display-capture; autoplay; clipboard-write; fullscreen",
          );
          iframe.setAttribute("allowfullscreen", "true");
        }
        api.addListener("videoConferenceJoined", () => setStatus(""));
        api.addListener("readyToClose", () => {
          if (isHost) void onEndRef.current();
          else onCloseRef.current();
        });
      } catch (error) {
        if (disposed || controller.signal.aborted) return;
        const message =
          error instanceof Error && error.message === "JaaS is not configured."
            ? l(
                "JaaS 환경 변수가 아직 설정되지 않았어요. 관리자에게 문의해 주세요.",
                "Biến môi trường JaaS chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
                "JaaS environment variables are not configured. Please contact the administrator.",
              )
            : l(
                "회의 인증에 실패했어요. 잠시 후 다시 시도해 주세요.",
                "Xác thực cuộc họp thất bại. Vui lòng thử lại sau.",
                "Meeting authentication failed. Please try again shortly.",
              );
        setStatus(message);
      }
    }

    void mountMeeting();
    return () => {
      disposed = true;
      controller.abort();
      api?.dispose();
    };
  }, [isHost, l, locale, roomName, userEmail, userName]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-room-title"
      className="fixed inset-0 z-[100] flex flex-col bg-[#0d0d0b] text-white"
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ffd84d]">
            LIVE MEETING
          </p>
          <h2 id="meeting-room-title" className="truncate text-lg font-black">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!externalUrl}
            onClick={() =>
              window.open(externalUrl, "_blank", "noopener,noreferrer")
            }
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/65 hover:bg-white/20 disabled:opacity-35"
          >
            {l(
              "카메라 문제 시 새 창",
              "Mở cửa sổ mới nếu camera lỗi",
              "Open a new window for camera issues",
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isHost) void onEnd();
              else onClose();
            }}
            className={`rounded-full px-4 py-2 text-xs font-black ${isHost ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20"}`}
          >
            {isHost
              ? l("회의 종료", "Kết thúc cuộc họp", "End meeting")
              : l("회의 나가기", "Rời cuộc họp", "Leave meeting")}
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(18rem,1fr)_minmax(15rem,40vh)] md:grid-cols-[minmax(0,1fr)_22rem] md:grid-rows-1">
        <div className="relative min-h-0">
          {status && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-bold text-white/50">
              {status}
            </p>
          )}
          <div ref={roomRef} className="absolute inset-0" />
        </div>
        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#171713] p-4 md:border-l md:border-t-0 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd84d]">
                MEETING NOTES
              </p>
              <h3 className="mt-1 text-lg font-black">
                {l("회의 내용 정리", "Ghi chú cuộc họp", "Meeting notes")}
              </h3>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${notesStatus === "error" ? "bg-red-400/15 text-red-300" : notesStatus === "saving" ? "bg-[#ffd84d]/15 text-[#ffd84d]" : "bg-emerald-300/15 text-emerald-300"}`}
            >
              {notesStatus === "error"
                ? l("저장 실패", "Lưu thất bại", "Save failed")
                : notesStatus === "saving"
                  ? l("저장 중…", "Đang lưu…", "Saving…")
                  : l("자동 저장됨", "Đã tự động lưu", "Autosaved")}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-white/40">
            {l(
              "핵심 논의, 결정 사항, 다음 할 일을 함께 적어 주세요. 회의 종료 후 최종 기록으로 보관돼요.",
              "Hãy cùng ghi lại nội dung chính, quyết định và việc tiếp theo. Nội dung sẽ được lưu làm biên bản cuối sau khi cuộc họp kết thúc.",
              "Write down key discussions, decisions, and next steps together. They will be kept as the final record after the meeting ends.",
            )}
          </p>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            maxLength={20000}
            aria-label={l(
              "회의 내용 정리",
              "Ghi chú cuộc họp",
              "Meeting notes",
            )}
            placeholder={l(
              "핵심 논의\n- \n\n결정 사항\n- \n\n다음 할 일\n- 담당자 / deadline",
              "Thảo luận chính\n- \n\nQuyết định\n- \n\nViệc tiếp theo\n- Người phụ trách / deadline",
              "Key discussion\n- \n\nDecisions\n- \n\nNext steps\n- Owner / deadline",
            )}
            className="mt-4 min-h-0 flex-1 resize-none rounded-2xl bg-white/[0.07] p-4 text-sm font-semibold leading-6 text-white outline-none ring-1 ring-white/10 placeholder:text-white/20 focus:ring-2 focus:ring-[#ffd84d]"
          />
          <p className="mt-2 text-right text-[10px] font-bold text-white/25">
            {notes.length.toLocaleString()} / 20,000
          </p>
        </aside>
      </div>
    </div>
  );
}
