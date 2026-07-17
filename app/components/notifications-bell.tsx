"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ensureDailyStreakReminder, formatPostDate, loadNotifications, markNotificationsRead, type LabNotification } from "../lib/lab-social";

export default function NotificationsBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<LabNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      await ensureDailyStreakReminder().catch(() => undefined);
      const items = await loadNotifications(userId);
      if (!cancelled) setNotifications(items);
    };
    refresh();
    const interval = window.setInterval(() => refresh().catch(() => undefined), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  const unread = notifications.filter((item) => !item.readAt);

  async function togglePanel() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && unread.length > 0) {
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      await markNotificationsRead(userId, unread.map((item) => item.id)).catch(() => undefined);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={togglePanel} aria-label="Notifications" aria-expanded={isOpen} className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5">
        {"\uD83D\uDD14"}
        {unread.length > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{Math.min(unread.length, 9)}{unread.length > 9 ? "+" : ""}</span>}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] bg-white shadow-[0_22px_70px_rgba(35,31,24,.22)] ring-1 ring-black/[0.08]">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <p className="font-black">{"\uC54C\uB9BC"}</p>
            <span className="text-xs font-bold text-stone-400">{"\uCD5C\uADFC "}{notifications.length}{"\uAC1C"}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-3xl">{"\uD83D\uDCA4"}</p>
                <p className="mt-3 text-sm font-bold text-stone-400">{"\uC544\uC9C1 \uC0C8 \uC54C\uB9BC\uC774 \uC5C6\uC5B4\uC694."}</p>
              </div>
            ) : notifications.map((item) => (
              <Link key={item.id} href={item.type.endsWith("_reminder") ? "/#new-post" : `/#post-${item.postId}`} onClick={() => setIsOpen(false)} className="flex gap-3 border-b border-stone-100 px-4 py-4 transition last:border-0 hover:bg-[#fff9df]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-black" style={item.type.endsWith("_reminder") ? { background: "#ffd84d", fontSize: "1.25rem" } : { background: item.actorAvatarBackground }}>
                  {item.type === "streak_reminder" ? "🔥" : item.actorInitials}
                </span>
                <span className="min-w-0 text-sm leading-5">
                  {item.type === "mission_reminder" ? (
                    <>
                      <span className="font-black">{item.missionTitle}</span>
                      <span className="block text-stone-600">{"\uC624\uB298 \uC544\uC9C1 \uC5C5\uB370\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694. \uC798\uD558\uACE0 \uC788\uC5B4?"}</span>
                    </>
                  ) : item.type === "streak_reminder" ? (
                    <><span className="font-black">연속 기록이 곧 끊겨요!</span><span className="block text-stone-600">오늘의 기록을 올려 스트릭을 지켜 주세요.</span></>
                  ) : (
                    <><span className="font-black">{item.actorName}</span>{item.type === "reaction" ? `\uB2D8\uC774 \uB0B4 \uAE30\uB85D\uC5D0 ${item.emoji ?? "\uD83D\uDC4F"} \uBC18\uC751\uC744 \uB0A8\uACBC\uC5B4\uC694.` : "\uB2D8\uC774 \uB0B4 \uAE30\uB85D\uC5D0 \uB313\uAE00\uC744 \uB0A8\uACBC\uC5B4\uC694."}</>
                  )}
                  {item.commentPreview && <span className="mt-1 block truncate text-xs font-medium text-stone-400">&quot;{item.commentPreview}&quot;</span>}
                  <span className="mt-1 block text-[11px] font-semibold text-stone-300">{formatPostDate(item.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
