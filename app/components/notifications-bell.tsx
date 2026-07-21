"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ensureDailyStreakReminder,
  formatPostDate,
  loadNotifications,
  markNotificationsRead,
  type LabNotification,
} from "../lib/lab-social";
import CharacterAvatar from "./character-avatar";
import { useI18n } from "../lib/i18n";

export default function NotificationsBell({ userId }: { userId: string }) {
  const { locale, l } = useI18n();
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
    const interval = window.setInterval(
      () => refresh().catch(() => undefined),
      30000,
    );
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
      setNotifications((current) =>
        current.map((item) => (item.readAt ? item : { ...item, readAt })),
      );
      await markNotificationsRead(
        userId,
        unread.map((item) => item.id),
      ).catch(() => undefined);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5"
      >
        {"\uD83D\uDD14"}
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {Math.min(unread.length, 9)}
            {unread.length > 9 ? "+" : ""}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] bg-white shadow-[0_22px_70px_rgba(35,31,24,.22)] ring-1 ring-black/[0.08]">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <p className="font-black">
              {l("알림", "Thông báo", "Notifications")}
            </p>
            <span className="text-xs font-bold text-stone-400">
              {l(
                `최근 ${notifications.length}개`,
                `${notifications.length} thông báo gần đây`,
                `${notifications.length} recent`,
              )}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-3xl">{"\uD83D\uDCA4"}</p>
                <p className="mt-3 text-sm font-bold text-stone-400">
                  {l(
                    "아직 새 알림이 없어요.",
                    "Chưa có thông báo mới.",
                    "No new notifications yet.",
                  )}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={
                    item.type === "team_project_invite"
                      ? "/meeting"
                      : item.type.endsWith("_reminder")
                        ? "/update#new-post"
                        : `/update#post-${item.postId}`
                  }
                  onClick={() => setIsOpen(false)}
                  className="flex gap-3 border-b border-stone-100 px-4 py-4 transition last:border-0 hover:bg-[#fff9df]"
                >
                  {item.type.endsWith("_reminder") ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd84d] text-xl">
                      {item.type === "streak_reminder" ? "🔥" : "🎯"}
                    </span>
                  ) : (
                    <CharacterAvatar
                      config={item.actorAvatarConfig}
                      background={item.actorAvatarBackground}
                      name={item.actorName}
                      size={40}
                    />
                  )}
                  <span className="min-w-0 text-sm leading-5">
                    {item.type === "team_project_invite" ? (
                      <>
                        <span className="font-black">{item.actorName}</span>
                        <span className="block text-stone-600">
                          {l(
                            `${item.projectTitle} 팀 프로젝트에 초대했어요.`,
                            `đã mời bạn tham gia dự án nhóm ${item.projectTitle}.`,
                            `invited you to the ${item.projectTitle} team project.`,
                          )}
                        </span>
                      </>
                    ) : item.type === "mission_reminder" ? (
                      <>
                        <span className="font-black">{item.missionTitle}</span>
                        <span className="block text-stone-600">
                          {l(
                            "오늘 아직 업데이트가 없어요. 잘하고 있어?",
                            "Hôm nay bạn chưa cập nhật. Mọi việc ổn chứ?",
                            "No update yet today. How is it going?",
                          )}
                        </span>
                      </>
                    ) : item.type === "streak_reminder" ? (
                      <>
                        <span className="font-black">
                          {l(
                            "연속 기록이 곧 끊겨요!",
                            "Chuỗi ngày sắp bị ngắt!",
                            "Your streak is about to end!",
                          )}
                        </span>
                        <span className="block text-stone-600">
                          {l(
                            "오늘의 기록을 올려 스트릭을 지켜 주세요.",
                            "Đăng ghi chép hôm nay để giữ chuỗi ngày.",
                            "Post today's entry to keep your streak.",
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-black">{item.actorName}</span>{" "}
                        {item.type === "reaction"
                          ? l(
                              `님이 내 기록에 ${item.emoji ?? "👏"} 반응을 남겼어요.`,
                              `đã bày tỏ ${item.emoji ?? "👏"} với bài của bạn.`,
                              `reacted ${item.emoji ?? "👏"} to your post.`,
                            )
                          : l(
                              "님이 내 기록에 댓글을 남겼어요.",
                              "đã bình luận về bài của bạn.",
                              "commented on your post.",
                            )}
                      </>
                    )}
                    {item.commentPreview && (
                      <span className="mt-1 block truncate text-xs font-medium text-stone-400">
                        &quot;{item.commentPreview}&quot;
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] font-semibold text-stone-300">
                      {formatPostDate(item.createdAt, locale)}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
