"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import DailyPostCard from "./components/daily-post-card";
import NotificationsBell from "./components/notifications-bell";
import { getCurrentUser, logoutAccount, type AuthUser } from "./lib/auth";
import {
  calculateCurrentStreak,
  createDailyPost,
  hasPostedToday,
  isPostStatus,
  loadDailyPosts,
  loadLabMembers,
  POST_STATUSES,
  type DailyPost,
  type LabMember,
} from "./lib/lab-social";

export default function Home() {
  const router = useRouter();
  const [localPosts, setLocalPosts] = useState<DailyPost[]>([]);
  const [currentMember, setCurrentMember] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }
        const [loadedMembers, loadedPosts] = await Promise.all([loadLabMembers(), loadDailyPosts()]);
        if (cancelled) return;
        setCurrentMember(user);
        setMembers(loadedMembers);
        setLocalPosts(loadedPosts);
      })
      .catch(() => setMessage("Supabase \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."));
    return () => { cancelled = true; };
  }, [router]);

  const allPosts = useMemo(
    () => [...localPosts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [localPosts],
  );
  const currentStreak = useMemo(
    () => currentMember ? calculateCurrentStreak(localPosts, currentMember.id) : 0,
    [currentMember, localPosts],
  );
  const postedToday = useMemo(
    () => currentMember ? hasPostedToday(localPosts, currentMember.id) : false,
    [currentMember, localPosts],
  );

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const photo = formData.get("photo");
    const caption = String(formData.get("caption")).trim();
    const statusValue = String(formData.get("status"));

    if (!(photo instanceof File) || photo.size === 0 || !caption || !isPostStatus(statusValue) || !currentMember) return;
    if (photo.size > 8 * 1024 * 1024) {
      setMessage("\uC0AC\uC9C4\uC740 8MB \uC774\uD558\uB85C \uC62C\uB824 \uC8FC\uC138\uC694.");
      return;
    }

    setIsPosting(true);
    setMessage("");
    try {
      const post = await createDailyPost(photo, caption, statusValue, currentMember.id);
      setLocalPosts((current) => [post, ...current]);
      setPreviewUrl("");
      form.reset();
      setMessage("\uC624\uB298\uC758 \uAE30\uB85D\uC774 \uB0B4 \uD504\uB85C\uD544\uC5D0 \uC62C\uB77C\uAC14\uC5B4\uC694!");
    } catch {
      setMessage("\uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
    } finally {
      setIsPosting(false);
    }
  }

  if (!currentMember) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG \uB85C\uB529 \uC911...</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f5f3ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 rotate-[-6deg] items-center justify-center rounded-[1rem] bg-[#ffd84d] text-xl shadow-[0_6px_0_#181611]">{"\u{1F4F8}"}</span>
            <div>
              <p className="text-xl font-black tracking-[-0.04em]">LABLOG</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Our lab, today</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsBell userId={currentMember.id} />
            <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="hidden rounded-full px-3 py-2 text-xs font-bold text-stone-400 transition hover:bg-white hover:text-stone-900 sm:block">{"\uB85C\uADF8\uC544\uC6C3"}</button>
            <Link href={`/members/${currentMember.id}`} className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black" style={{ background: currentMember.avatarBackground }}>{currentMember.initials}</span>
              <span className="hidden text-sm font-bold sm:inline">{"\uB0B4 \uD504\uB85C\uD544"}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-[#ffd84d] px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">Today in the lab</p>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-[-0.055em] sm:text-6xl">
              {"\uC6B0\uB9AC\uAC00 \uB9CC\uB4E4\uC5B4 \uAC00\uB294"}<br />{"\uC624\uB298\uC744 \uACF5\uC720\uD574\uC694."}
            </h1>
          </div>
          <p className="max-w-sm text-sm font-medium leading-6 text-stone-500 sm:text-right">{"\uC791\uC740 \uC131\uACF5, \uB9C9\uD78C, \uC0C8\uB85C\uC6B4 \uC544\uC774\uB514\uC5B4\uAE4C\uC9C0. \uC624\uB298 \uD55C \uC77C\uC744 \uC0AC\uC9C4 \uD55C \uC7A5\uC73C\uB85C \uB0A8\uACA8 \uBCF4\uC138\uC694."}</p>
        </section>

        <section className={`mb-6 flex flex-col gap-4 rounded-[1.75rem] border p-5 sm:flex-row sm:items-center sm:justify-between ${postedToday ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-[#fff9df]"}`}>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">{postedToday ? "🔥" : "⏳"}</span>
            <div>
              <p className="text-lg font-black">{currentStreak}일 연속 기록 중</p>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                {postedToday ? "오늘의 기록을 완료했어요. 연속 기록이 안전해요!" : "오늘 기록을 올려 연속 기록을 이어 가세요. 오후 8시에 알림을 보내 드려요."}
              </p>
            </div>
          </div>
          {!postedToday && <a href="#new-post" className="shrink-0 rounded-full bg-stone-950 px-5 py-3 text-center text-sm font-black text-white">오늘 기록하기</a>}
        </section>

        <section id="new-post" className="mb-12 scroll-mt-28 overflow-hidden rounded-[2.25rem] bg-[#181611] p-4 text-white shadow-[0_24px_80px_rgba(40,32,14,0.18)] sm:p-6">
          <form onSubmit={handlePostSubmit} className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div className="relative">
              <label className="group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-[1.75rem] border-2 border-dashed border-white/20 bg-white/[0.06] transition hover:border-[#ffd84d]/70" style={previewUrl ? { backgroundImage: `url("${previewUrl}")`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#0c0a09" } : undefined}>
              {!previewUrl && (
                <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd84d] text-3xl text-stone-950 transition group-hover:scale-110">{"\u{1F4F7}"}</span>
                  <span className="mt-4 text-sm font-bold">{"\uC624\uB298\uC758 \uC0AC\uC9C4 \uACE0\uB974\uAE30"}</span>
                  <span className="mt-1 text-xs text-white/45">JPG, PNG · max 8MB</span>
                </span>
              )}
              {previewUrl && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur">{"\uC0AC\uC9C4 \uBC14\uAFB8\uAE30"}</span>}
                <input
                  className="sr-only"
                  name="photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setPreviewUrl("");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setPreviewUrl(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {previewUrl && (
                <button
                  type="button"
                  aria-label="Remove selected photo"
                  title="Remove photo"
                  onClick={(event) => {
                    const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input[name=photo]");
                    if (input) input.value = "";
                    setPreviewUrl("");
                  }}
                  className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl font-medium leading-none text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {"\u00D7"}
                </button>
              )}
            </div>

            <div className="px-1 sm:px-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-black text-stone-950" style={{ background: currentMember.avatarBackground }}>{currentMember.initials}</span>
                <div><p className="font-bold">{currentMember.name}</p><p className="text-xs text-white/45">{"\uC624\uB298 \uBB50 \uD588\uC5B4\uC694?"}</p></div>
              </div>
              <textarea name="caption" required maxLength={180} placeholder="오늘 해결한 문제, 배운 것, 진행한 실험을 남겨 보세요..." className="mt-5 min-h-32 w-full resize-none border-0 bg-transparent text-xl font-bold leading-8 text-white outline-none placeholder:text-white/25 sm:text-2xl" />
              <fieldset className="mt-4">
                <legend className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">기록 상태</legend>
                <div className="flex flex-wrap gap-2">
                  {POST_STATUSES.map((status) => (
                    <label key={status.value} className="cursor-pointer">
                      <input className="peer sr-only" type="radio" name="status" value={status.value} defaultChecked={status.value === "working"} />
                      <span className="inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/65 ring-1 ring-white/10 transition hover:bg-white/15 peer-checked:bg-[#ffd84d] peer-checked:text-stone-950 peer-checked:ring-[#ffd84d]">
                        {status.emoji} {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-white/35">{"\uAE30\uB85D\uC740 \uB0B4 \uD504\uB85C\uD544\uACFC \uB7A9 \uD53C\uB4DC\uC5D0 \uBC14\uB85C \uBCF4\uC5EC\uC694."}</p>
                <button disabled={isPosting} type="submit" className="rounded-full bg-[#ffd84d] px-6 py-3 text-sm font-black text-stone-950 shadow-[0_5px_0_#a88400] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-60">
                  {isPosting ? "\uC62C\uB9AC\uB294 \uC911..." : "\uC624\uB298 \uAE30\uB85D \uC62C\uB9AC\uAE30"}
                </button>
              </div>
              {message && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-[#ffe785]">{message}</p>}
            </div>
          </form>
        </section>

        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Lab members</p><h2 className="mt-1 text-2xl font-black tracking-tight">{"\uC6B0\uB9AC \uC5F0\uAD6C\uC2E4 \uBA64\uBC84"}</h2></div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-500 ring-1 ring-black/[0.05]">{members.length} members</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {members.map((member) => (
              <Link key={member.id} href={`/members/${member.id}`} className="group rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-black shadow-inner transition group-hover:scale-105" style={{ background: member.avatarBackground }}>{member.initials}</div>
                <p className="mt-4 font-black">{member.name}{member.id === currentMember.id && <span className="ml-1 text-xs text-amber-500">ME</span>}</p>
                <p className="mt-1 truncate text-xs font-medium text-stone-400">{member.role}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-600"><span className="h-2 w-2 rounded-full bg-emerald-400" />{member.status}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Fresh from the lab</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{"\uCD5C\uADFC \uAE30\uB85D"}</h2></div>
            <span className="hidden text-sm font-semibold text-stone-400 sm:block">{"\uC11C\uB85C\uC758 \uC624\uB298\uC744 \uC751\uC6D0\uD574\uC694 \u{1F44B}"}</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts.map((post) => {
              const member = members.find((item) => item.id === post.memberId);
              return member ? <DailyPostCard key={post.id} post={post} member={member} currentUserId={currentMember.id} members={members} /> : null;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
