"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AvatarDesigner from "../../components/avatar-designer";
import CharacterAvatar from "../../components/character-avatar";
import DailyPostCard from "../../components/daily-post-card";
import FloatingNav from "../../components/floating-nav";
import LanguageSwitcher from "../../components/language-switcher";
import NotificationsBell from "../../components/notifications-bell";
import { getCurrentUser, logoutAccount, type AuthUser } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import {
  calculateCurrentStreak,
  getMemberAvailability,
  loadCalendarEvents,
  loadDailyPosts,
  loadLabMembers,
  loadTeamProjectRewardTotal,
  type DailyPost,
  type CalendarEvent,
  type LabMember,
} from "../../lib/lab-social";

export default function MemberProfilePage() {
  const router = useRouter();
  const { l } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [localPosts, setLocalPosts] = useState<DailyPost[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [teamProjectScore, setTeamProjectScore] = useState(0);
  const member = members.find((item) => item.id === id);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!user.onboardingCompletedAt) {
          router.replace("/labquest");
          return;
        }
        const [
          loadedMembers,
          loadedPosts,
          loadedCalendarEvents,
          loadedTeamProjectScore,
        ] = await Promise.all([
          loadLabMembers(),
          loadDailyPosts(),
          loadCalendarEvents().catch(() => []),
          loadTeamProjectRewardTotal(id).catch(() => 0),
        ]);
        if (cancelled) return;
        setCurrentUser(user);
        setMembers(loadedMembers);
        setLocalPosts(loadedPosts);
        setCalendarEvents(loadedCalendarEvents);
        setTeamProjectScore(loadedTeamProjectScore);
      })
      .catch(() => router.replace("/login"));
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const memberPosts = useMemo(
    () =>
      [...localPosts]
        .filter((post) => post.memberId === id)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [id, localPosts],
  );
  const currentStreak = useMemo(
    () => calculateCurrentStreak(localPosts, id),
    [id, localPosts],
  );
  const totalScore = useMemo(
    () =>
      memberPosts.reduce((sum, post) => sum + post.scoreAwarded, 0) +
      teamProjectScore,
    [memberPosts, teamProjectScore],
  );

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
        <p className="text-sm font-black text-stone-400">
          {l("LABLOG 로딩 중...", "Đang tải LABLOG...", "Loading LABLOG...")}
        </p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-6 text-center text-stone-950">
        <div>
          <p className="text-6xl">{"\u{1F50D}"}</p>
          <h1 className="mt-5 text-3xl font-black">
            {l(
              "멤버를 찾을 수 없어요",
              "Không tìm thấy thành viên",
              "Member not found",
            )}
          </h1>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white"
          >
            {l("홈으로 돌아가기", "Về trang chủ", "Back home")}
          </Link>
        </div>
      </main>
    );
  }

  const isMe = member.id === currentUser.id;
  const availability = getMemberAvailability(calendarEvents, member.id);

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <header className="relative z-[60] border-b border-black/[0.06] bg-[#f5f3ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href={
              currentUser.chapterTwoCompletedAt
                ? "/update#feed"
                : "/labquest?chapter=2&locked=feed"
            }
            className="flex items-center gap-2 text-sm font-black transition hover:-translate-x-1"
          >
            {currentUser.chapterTwoCompletedAt
              ? l("← 랩 피드", "← Bảng tin Lab", "← Lab feed")
              : l("🔒 랩 피드", "🔒 Bảng tin Lab", "🔒 Lab feed")}
          </Link>
          <Link href="/" className="text-lg font-black tracking-[-0.04em]">
            LABLOG
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <NotificationsBell userId={currentUser.id} />
            <button
              type="button"
              onClick={async () => {
                await logoutAccount();
                router.replace("/login");
              }}
              className="hidden text-right text-xs font-bold text-stone-400 hover:text-stone-900 sm:block"
            >
              {l("로그아웃", "Đăng xuất", "Log out")}
            </button>
          </div>
        </div>
      </header>
      <FloatingNav />

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <section
          className={`relative overflow-visible rounded-[2.5rem] bg-[#181611] px-6 py-8 text-white shadow-[0_24px_80px_rgba(40,32,14,0.18)] sm:px-10 sm:py-10 ${isMe && !currentUser.chapterTwoCompletedAt ? "mb-36" : ""}`}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: member.avatarBackground }}
          />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <CharacterAvatar
                  config={member.avatarConfig}
                  background={member.avatarBackground}
                  name={member.name}
                  size={112}
                  className="ring-8 ring-white/10 shadow-2xl"
                />
                {isMe && (
                  <div className="absolute -bottom-1 -right-1">
                    <AvatarDesigner
                      userId={currentUser.id}
                      name={currentUser.name}
                      background={currentUser.avatarBackground}
                      initialConfig={currentUser.avatarConfig}
                      onSaved={(avatarConfig) => {
                        setCurrentUser((current) =>
                          current ? { ...current, avatarConfig } : current,
                        );
                        setMembers((items) =>
                          items.map((item) =>
                            item.id === currentUser.id
                              ? { ...item, avatarConfig }
                              : item,
                          ),
                        );
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                    {member.name}
                  </h1>
                  {isMe && (
                    <span className="rounded-full bg-[#ffd84d] px-2 py-1 text-[10px] font-black text-stone-950">
                      ME
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  {member.role}
                </p>
                {availability ? (
                  <p
                    className="mt-4 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black text-stone-950"
                    style={{ backgroundColor: availability.color }}
                  >
                    {availability.emoji} {availability.label}
                    <span className="max-w-40 truncate opacity-60">
                      · {availability.eventTitle}
                    </span>
                  </p>
                ) : (
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                    {l(
                      "연구실 상태 미등록",
                      "Chưa đặt trạng thái phòng lab",
                      "Lab status not set",
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="min-w-24 rounded-2xl bg-orange-500/20 px-5 py-4 text-center">
                <p className="text-2xl font-black">🔥 {currentStreak}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  day streak
                </p>
              </div>
              <div className="relative min-w-24 rounded-2xl bg-violet-500/20 px-5 py-4 text-center">
                <p className="text-2xl font-black">{totalScore}P</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  score
                </p>
                {isMe && !currentUser.chapterTwoCompletedAt && (
                  <div className="absolute right-0 top-[calc(100%+1rem)] z-30 w-72 rounded-2xl bg-white p-5 text-left text-stone-950 shadow-[0_18px_50px_rgba(0,0,0,.3)] before:absolute before:-top-2 before:right-9 before:h-4 before:w-4 before:rotate-45 before:bg-white">
                    <p className="text-[10px] font-black tracking-[.16em] text-violet-500">
                      SCORE GUIDE
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6">
                      {l(
                        "포인트를 모으고 싶나요? Chapter 2 미션을 완료하면 Mission, Update, Feed, Team 기능이 열려요.",
                        "Bạn muốn tích điểm? Hoàn thành nhiệm vụ Chapter 2 để mở Mission, Update, Feed và Team.",
                        "Want to earn points? Complete Chapter 2 missions to unlock Mission, Update, Feed, and Team.",
                      )}
                    </p>
                    <Link
                      href="/labquest?chapter=2&locked=score"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-[0_5px_0_#c7a600]"
                    >
                      {l("시작하기", "Bắt đầu", "Start")}
                    </Link>
                  </div>
                )}
              </div>
              <div className="min-w-24 rounded-2xl bg-white/10 px-5 py-4 text-center">
                <p className="text-2xl font-black">{memberPosts.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  records
                </p>
              </div>
              {isMe && (
                <Link
                  href={
                    currentUser.chapterTwoCompletedAt
                      ? "/update#new-post"
                      : "/labquest?chapter=2&locked=update"
                  }
                  className="flex items-center rounded-2xl bg-[#ffd84d] px-5 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5"
                >
                  {currentUser.chapterTwoCompletedAt
                    ? l("새 기록 올리기", "Đăng ghi chép mới", "Post new entry")
                    : l(
                        "🔒 새 기록 올리기",
                        "🔒 Đăng ghi chép mới",
                        "🔒 Post new entry",
                      )}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Daily archive
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                {l("오늘의 기록들", "Ghi chép hôm nay", "Today's entries")}
              </h2>
            </div>
            <p className="hidden text-sm font-semibold text-stone-400 sm:block">
              {l(
                `${member.name}님의 연구실 일상`,
                `Cuộc sống phòng lab của ${member.name}`,
                `${member.name}'s lab life`,
              )}
            </p>
          </div>

          {memberPosts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {memberPosts.map((post) => (
                <DailyPostCard
                  key={post.id}
                  post={post}
                  member={member}
                  currentUserId={currentUser.id}
                  members={members}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white/45 px-6 py-16 text-center">
              <p className="text-5xl">{"\u{1F4F7}"}</p>
              <h3 className="mt-5 text-xl font-black">
                {isMe
                  ? l(
                      "아직 올린 기록이 없어요",
                      "Bạn chưa đăng ghi chép nào",
                      "You have not posted any entries yet",
                    )
                  : l(
                      "아직 공유된 기록이 없어요",
                      "Chưa có ghi chép được chia sẻ",
                      "No entries have been shared yet",
                    )}
              </h3>
              <p className="mt-2 text-sm font-medium text-stone-400">
                {isMe
                  ? l(
                      "오늘 한 일을 첫 사진으로 남겨 보세요.",
                      "Hãy lưu lại việc hôm nay bằng bức ảnh đầu tiên.",
                      "Capture what you did today with your first photo.",
                    )
                  : l(
                      "첫 기록을 기다려 주세요.",
                      "Hãy chờ ghi chép đầu tiên.",
                      "Check back for the first entry.",
                    )}
              </p>
              {isMe && (
                <Link
                  href={
                    currentUser.chapterTwoCompletedAt
                      ? "/update#new-post"
                      : "/labquest?chapter=2&locked=update"
                  }
                  className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white"
                >
                  {currentUser.chapterTwoCompletedAt
                    ? l("기록 올리기", "Đăng ghi chép", "Post entry")
                    : l("🔒 기록 올리기", "🔒 Đăng ghi chép", "🔒 Post entry")}
                </Link>
              )}
            </div>
          )}
        </section>

        {currentUser.chapterTwoCompletedAt ? (
          <section className="mt-14 border-t border-black/[0.07] pt-8">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              More lab members
            </p>
            <div className="flex flex-wrap gap-3">
              {members
                .filter((item) => item.id !== member.id)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/members/${item.id}`}
                    className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-bold shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-0.5"
                  >
                    <CharacterAvatar
                      config={item.avatarConfig}
                      background={item.avatarBackground}
                      name={item.name}
                      size={36}
                    />
                    {item.name}
                  </Link>
                ))}
            </div>
          </section>
        ) : (
          isMe && (
            <section className="mt-14 rounded-[1.75rem] border border-stone-200 bg-stone-100 p-6 text-stone-400">
              <p className="text-xs font-black tracking-[.16em]">
                🔒 TEAM · CHAPTER 2
              </p>
              <p className="mt-2 text-sm font-semibold">
                {l(
                  "Chapter 2를 완료하면 다른 랩 멤버의 프로필을 볼 수 있어요.",
                  "Hoàn thành Chapter 2 để xem hồ sơ của các thành viên Lab khác.",
                  "Complete Chapter 2 to view other Lab members' profiles.",
                )}
              </p>
            </section>
          )
        )}
      </div>
    </main>
  );
}
