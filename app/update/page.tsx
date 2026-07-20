"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import DailyPostCard from "../components/daily-post-card";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  calculateCurrentStreak,
  createDailyPost,
  getMemberAvailability,
  hasPostedToday,
  isMomentCategory,
  isPostStatus,
  loadActiveMissions,
  loadCalendarEvents,
  loadDailyPosts,
  loadLabMembers,
  MOMENT_CATEGORIES,
  POST_STATUSES,
  type CalendarEvent,
  type DailyPost,
  type LabMember,
  type Mission,
  type PostKind,
} from "../lib/lab-social";

export default function UpdatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [postKind, setPostKind] = useState<PostKind>("work");
  const [feedFilter, setFeedFilter] = useState<"all" | PostKind>("all");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!currentUser.chapterTwoCompletedAt) {
        router.replace("/labquest?chapter=2&locked=update");
        return;
      }
      const [activeMissions, loadedPosts, loadedMembers, loadedCalendarEvents] = await Promise.all([
        loadActiveMissions(currentUser.id),
        loadDailyPosts(),
        loadLabMembers(),
        loadCalendarEvents().catch(() => []),
      ]);
      if (cancelled) return;
      setUser(currentUser);
      setMissions(activeMissions);
      setPosts(loadedPosts);
      setMembers(loadedMembers);
      setCalendarEvents(loadedCalendarEvents);
    }).catch(() => setMessage("Supabase \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."));
    return () => { cancelled = true; };
  }, [router]);

  const currentStreak = useMemo(() => user ? calculateCurrentStreak(posts, user.id) : 0, [posts, user]);
  const postedToday = useMemo(() => user ? hasPostedToday(posts, user.id) : false, [posts, user]);
  const sortedPosts = useMemo(
    () => posts
      .filter((post) => feedFilter === "all" || post.kind === feedFilter)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [feedFilter, posts],
  );

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const photo = data.get("photo");
    const caption = String(data.get("caption")).trim();
    const kind: PostKind = String(data.get("postKind")) === "moment" ? "moment" : "work";
    const momentCategoryValue = String(data.get("momentCategory") ?? "daily");
    const momentCategory = kind === "moment" && isMomentCategory(momentCategoryValue) ? momentCategoryValue : null;
    const statusValue = kind === "moment" ? "working" : String(data.get("status"));
    const missionId = kind === "work" ? String(data.get("missionId") ?? "") || null : null;
    if (!(photo instanceof File) || photo.size === 0 || !caption || !isPostStatus(statusValue) || !user) return;
    if (kind === "work" && missions.length > 0 && !missions.some((mission) => mission.id === missionId)) {
      setMessage("이 업데이트가 어떤 미션의 기록인지 선택해 주세요.");
      return;
    }
    if (photo.size > 8 * 1024 * 1024) {
      setMessage("\uC0AC\uC9C4\uC740 8MB \uC774\uD558\uB85C \uC62C\uB824 \uC8FC\uC138\uC694.");
      return;
    }

    setIsPosting(true);
    setMessage("");
    try {
      const post = await createDailyPost(photo, caption, statusValue, kind, momentCategory, user.id, missionId);
      setPosts((current) => [post, ...current]);
      setPreviewUrl("");
      form.reset();
      setMessage(kind === "moment"
        ? "Lab Moment를 공유했어요. 점수와 스트릭에는 영향을 주지 않아요."
        : post.scoreAwarded > 0
          ? `오늘의 업데이트 완료! +${post.scoreAwarded}P`
          : "업데이트가 저장됐어요. 오늘 점수는 이미 받았어요.");
    } catch {
      setMessage("\uC5C5\uB370\uC774\uD2B8\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
    } finally {
      setIsPosting(false);
    }
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">03 / Update</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{"\uC624\uB298\uC744 \uAE30\uB85D\uD574\uC694."}</h1>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-black/[0.05]"><p className="text-xl font-black">{"\uD83D\uDD25"} {currentStreak}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">streak</p></div>
            <div className={`rounded-2xl px-4 py-3 text-center ring-1 ${postedToday ? "bg-emerald-50 ring-emerald-200" : "bg-[#fff9df] ring-amber-200"}`}><p className="text-xl font-black">{postedToday ? "\u2713" : "\u00B7"}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">today</p></div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-xl">🎯</span>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-stone-400">ACTIVE MISSIONS</p><p className="mt-0.5 font-black">{missions.length > 0 ? `${missions.length}개의 미션 진행 중` : "아직 진행 중인 미션이 없어요"}</p></div>
            </div>
            <Link href="/mission" className="rounded-full bg-stone-100 px-4 py-2 text-xs font-black text-stone-600 hover:bg-stone-200">미션 보기</Link>
          </div>
          {missions.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{missions.map((mission) => <span key={mission.id} className="shrink-0 rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">{mission.title} · +{mission.pointsPerUpdate}P</span>)}</div>}
        </div>

        <section id="new-post" className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#181611] p-3 text-white shadow-[0_24px_80px_rgba(40,32,14,0.18)] sm:p-4">
          <form onSubmit={submitUpdate} className="grid gap-4 lg:grid-cols-[0.64fr_1.36fr] lg:items-center">
            <div className="relative mx-auto w-full max-w-sm">
              <label className="group relative block h-36 cursor-pointer overflow-hidden rounded-[1.5rem] border-2 border-dashed border-white/20 bg-white/[0.06] transition hover:border-[#ffd84d]/70 sm:h-40" style={previewUrl ? { backgroundImage: `url("${previewUrl}")`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#0c0a09" } : undefined}>
                {!previewUrl && <span className="absolute inset-0 flex flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd84d] text-2xl text-stone-950">{"\uD83D\uDCF7"}</span><span className="mt-2 text-sm font-bold">{"\uC624\uB298\uC758 \uC0AC\uC9C4 \uACE0\uB974\uAE30"}</span><span className="mt-0.5 text-[10px] text-white/45">JPG, PNG, WEBP - max 8MB</span></span>}
                {previewUrl && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur">{"\uC0AC\uC9C4 \uBC14\uAFB8\uAE30"}</span>}
                <input className="sr-only" name="photo" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) { setPreviewUrl(""); return; }
                  const reader = new FileReader();
                  reader.onload = () => setPreviewUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }} />
              </label>
              {previewUrl && <button type="button" aria-label="Remove selected photo" onClick={(event) => {
                const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input[name=photo]");
                if (input) input.value = "";
                setPreviewUrl("");
              }} className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white shadow-lg hover:bg-red-500">{"\u00D7"}</button>}
            </div>

            <div className="px-1 sm:px-2">
              <div className="flex items-center gap-3"><CharacterAvatar config={user.avatarConfig} background={user.avatarBackground} name={user.name} size={40} /><div><p className="font-bold">{user.name}</p><p className="text-xs text-white/45">{"\uC624\uB298 \uBB50 \uD588\uC5B4\uC694?"}</p></div></div>
              <input type="hidden" name="postKind" value={postKind} />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.06] p-1 ring-1 ring-white/10">
                <button type="button" onClick={() => { setPostKind("work"); setMessage(""); }} className={`rounded-xl px-3 py-2 text-left transition ${postKind === "work" ? "bg-[#ffd84d] text-stone-950" : "text-white/55 hover:bg-white/10"}`}>
                  <span className="block text-sm font-black">🛠️ Work Update</span><span className="mt-0.5 block text-[10px] font-bold opacity-60">미션 · 점수 · 스트릭</span>
                </button>
                <button type="button" onClick={() => { setPostKind("moment"); setMessage(""); }} className={`rounded-xl px-3 py-2 text-left transition ${postKind === "moment" ? "bg-emerald-300 text-emerald-950" : "text-white/55 hover:bg-white/10"}`}>
                  <span className="block text-sm font-black">🌿 Lab Moment</span><span className="mt-0.5 block text-[10px] font-bold opacity-60">일상 · 여행 · 휴식</span>
                </button>
              </div>
              <textarea name="caption" required maxLength={180} placeholder={postKind === "moment" ? "여행, 맛있는 음식, 오늘의 작은 순간을 공유해 보세요..." : "배운 것, 진행한 것, 막힌 점을 남겨 보세요..."} className="mt-3 min-h-20 w-full resize-none border-0 bg-transparent text-lg font-bold leading-7 text-white outline-none placeholder:text-white/25 sm:text-xl" />
              <div className={postKind === "work" ? "contents" : "hidden"}>
              {missions.length > 0 ? (
                <fieldset className="mt-3">
                  <legend className="mb-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/45">어떤 미션의 기록인가요?</legend>
                  <div className="flex flex-wrap gap-1.5">{missions.map((mission, index) => <label key={mission.id} className="cursor-pointer"><input className="peer sr-only" type="radio" name="missionId" value={mission.id} defaultChecked={index === 0} /><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/65 ring-1 ring-white/10 transition peer-checked:bg-[#b59cff] peer-checked:text-stone-950">🎯 {mission.title}</span></label>)}</div>
                </fieldset>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3"><p className="text-xs font-bold text-white/45">미션 없이 일반 기록으로 저장돼요.</p><Link href="/mission" className="shrink-0 text-xs font-black text-[#ffd84d]">미션 추가 →</Link></div>
              )}
              <fieldset className="mt-3"><legend className="mb-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/45">{"\uAE30\uB85D \uC0C1\uD0DC"}</legend><div className="flex flex-wrap gap-1.5">{POST_STATUSES.map((status) => <label key={status.value} className="cursor-pointer"><input className="peer sr-only" type="radio" name="status" value={status.value} defaultChecked={status.value === "working"} /><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/65 ring-1 ring-white/10 transition peer-checked:bg-[#ffd84d] peer-checked:text-stone-950">{status.emoji} {status.label}</span></label>)}</div></fieldset>
              </div>
              {postKind === "moment" && <fieldset className="mt-4 rounded-2xl bg-emerald-300/10 px-4 py-3 ring-1 ring-emerald-300/20"><legend className="px-1 text-xs font-black text-emerald-200">어떤 순간인가요?</legend><div className="mt-2 flex flex-wrap gap-2">{MOMENT_CATEGORIES.map((category) => <label key={category.value} className="cursor-pointer"><input className="peer sr-only" type="radio" name="momentCategory" value={category.value} defaultChecked={category.value === "daily"} /><span className="inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/60 ring-1 ring-white/10 transition peer-checked:bg-emerald-300 peer-checked:text-emerald-950">{category.emoji} {category.label}</span></label>)}</div><p className="mt-3 text-[11px] font-semibold leading-5 text-white/40">미션과 연결되지 않으며 점수와 스트릭에 영향을 주지 않아요.</p></fieldset>}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-medium text-white/35">{postKind === "moment" ? "Lab 멤버들과 일상의 순간을 나눠 보세요." : "기록은 미션과 피드에 바로 반영돼요."}</p><button disabled={isPosting} type="submit" className={`rounded-full px-5 py-2.5 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-50 ${postKind === "moment" ? "bg-emerald-300 shadow-[0_4px_0_#367b62]" : "bg-[#ffd84d] shadow-[0_4px_0_#a88400]"}`}>{isPosting ? "올리는 중..." : postKind === "moment" ? "Moment 공유하기" : "오늘 업데이트"}</button></div>
              {message && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-[#ffe785]">{message}</p>}
            </div>
          </form>
        </section>

        <section id="feed" className="mt-16 scroll-mt-24 border-t border-black/[0.08] pt-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Team feed</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-5xl">{"\uC6B0\uB9AC\uC758 \uC624\uB298"}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([{"value":"all","label":"전체"},{"value":"work","label":"Work"},{"value":"moment","label":"Lab Life"}] as const).map((filter) => <button key={filter.value} type="button" onClick={() => setFeedFilter(filter.value)} className={`rounded-full px-4 py-2 text-xs font-black transition ${feedFilter === filter.value ? filter.value === "moment" ? "bg-emerald-300 text-emerald-950" : "bg-stone-950 text-white" : "bg-white text-stone-500 shadow-sm ring-1 ring-black/[0.06] hover:text-stone-950"}`}>{filter.label}</button>)}
              <Link href="/mission" className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-500 shadow-sm ring-1 ring-black/[0.06] hover:text-stone-950">미션 확인</Link>
            </div>
          </div>

          <div id="team" className="mb-9 flex scroll-mt-24 gap-3 overflow-x-auto pb-2">
            {members.map((member) => {
              const availability = getMemberAvailability(calendarEvents, member.id);
              return (
              <Link key={member.id} href={`/members/${member.id}`} className="flex min-w-48 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-0.5">
                <CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={44} />
                <span className="min-w-0"><span className="block truncate text-sm font-black">{member.name}</span>{availability ? <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-1 text-[9px] font-black text-stone-950" style={{ backgroundColor: availability.color }}>{availability.emoji} {availability.label}</span> : <span className="mt-0.5 block truncate text-[10px] font-semibold text-stone-400">연구실 상태 미등록</span>}</span>
              </Link>
              );
            })}
          </div>

          {sortedPosts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPosts.map((post) => {
                const member = members.find((item) => item.id === post.memberId);
                return member ? <DailyPostCard key={post.id} post={post} member={member} currentUserId={user.id} members={members} /> : null;
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white/50 px-6 py-14 text-center">
              <p className="text-4xl">{"\uD83D\uDCF7"}</p>
              <p className="mt-3 text-sm font-black text-stone-400">{"\uC544\uC9C1 \uC5C5\uB370\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694."}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
