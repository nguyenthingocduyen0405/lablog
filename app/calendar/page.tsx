"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/app-header";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  calculateCurrentStreak,
  getPostStatus,
  loadActiveMissions,
  loadDailyPosts,
  seoulDateKey,
  type DailyPost,
  type Mission,
} from "../lib/lab-social";

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
const missionColors = ["#9d83ff", "#f5c842", "#55c9a5", "#ff8aa5", "#65a9ff", "#ff9a55"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState("");
  const [missionFilter, setMissionFilter] = useState("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      const [loadedPosts, activeMissions] = await Promise.all([loadDailyPosts(), loadActiveMissions(currentUser.id)]);
      if (cancelled) return;
      setUser(currentUser);
      setPosts(loadedPosts.filter((post) => post.memberId === currentUser.id));
      setMissions(activeMissions);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("캘린더를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  const missionOptions = useMemo(() => [...new Set([
    ...missions.map((mission) => mission.title),
    ...posts.map((post) => post.missionTitle).filter((title): title is string => Boolean(title)),
  ])], [missions, posts]);

  const filteredPosts = useMemo(() => missionFilter === "all" ? posts : posts.filter((post) => post.missionTitle === missionFilter), [missionFilter, posts]);
  const visibleMonthKey = monthKey(visibleMonth);
  const monthPosts = useMemo(() => filteredPosts.filter((post) => seoulDateKey(new Date(post.createdAt)).startsWith(visibleMonthKey)), [filteredPosts, visibleMonthKey]);
  const postsByDay = useMemo(() => {
    const grouped = new Map<string, DailyPost[]>();
    monthPosts.forEach((post) => {
      const key = seoulDateKey(new Date(post.createdAt));
      grouped.set(key, [...(grouped.get(key) ?? []), post]);
    });
    return grouped;
  }, [monthPosts]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedPosts = selectedDay ? postsByDay.get(selectedDay) ?? [] : [];
  const updateDays = postsByDay.size;
  const monthScore = monthPosts.reduce((sum, post) => sum + post.scoreAwarded, 0);
  const completedMissions = new Set(monthPosts.map((post) => post.missionTitle).filter(Boolean)).size;
  const currentStreak = user ? calculateCurrentStreak(posts, user.id) : 0;
  const today = seoulDateKey(new Date());

  function missionColor(title: string | null) {
    if (!title) return "#a8a29e";
    const index = Math.max(0, missionOptions.indexOf(title));
    return missionColors[index % missionColors.length];
  }

  function changeMonth(offset: number) {
    setVisibleMonth(new Date(year, month + offset, 1));
    setSelectedDay("");
  }

  if (isLoading || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">CALENDAR LOADING...</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">ACTIVITY JOURNAL</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">나의 기록 캘린더</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-stone-400">작은 업데이트가 쌓인 흐름을 한눈에 보고, 날짜별 기록을 다시 열어 보세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.05]"><p className="text-xl font-black">{updateDays}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">UPDATE DAYS</p></div>
            <div className="rounded-2xl bg-[#fff4bd] px-4 py-3 ring-1 ring-amber-200"><p className="text-xl font-black">{monthScore}P</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-500">THIS MONTH</p></div>
            <div className="rounded-2xl bg-violet-100 px-4 py-3 ring-1 ring-violet-200"><p className="text-xl font-black">🔥 {currentStreak}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-500">STREAK</p></div>
          </div>
        </div>

        {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setMissionFilter("all")} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${missionFilter === "all" ? "bg-stone-950 text-white" : "bg-white text-stone-500 ring-1 ring-black/[0.06]"}`}>전체 기록</button>
          {missionOptions.map((title) => <button key={title} type="button" onClick={() => setMissionFilter(title)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${missionFilter === title ? "text-stone-950 shadow-sm" : "bg-white text-stone-500 ring-1 ring-black/[0.06]"}`} style={missionFilter === title ? { backgroundColor: missionColor(title) } : undefined}>● {title}</button>)}
        </div>

        <div className="mt-3 grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <section className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_22px_70px_rgba(38,32,22,.09)] ring-1 ring-black/[0.05] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">MONTHLY VIEW</p><h2 className="mt-1 text-2xl font-black">{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(visibleMonth)}</h2></div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-black hover:bg-stone-200">‹</button><button type="button" onClick={() => { setVisibleMonth(new Date()); setSelectedDay(today); }} className="rounded-full bg-[#ffd84d] px-4 py-2.5 text-xs font-black">오늘</button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-black hover:bg-stone-200">›</button></div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekdays.map((day, index) => <div key={day} className={`pb-1 text-center text-[10px] font-black uppercase ${index > 4 ? "text-violet-400" : "text-stone-300"}`}>{day}</div>)}
              {calendarCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
                const key = dateKey(year, month, day);
                const dayPosts = postsByDay.get(key) ?? [];
                const preview = dayPosts.find((post) => post.imageDataUrl);
                const active = selectedDay === key;
                return (
                  <button key={key} type="button" onClick={() => setSelectedDay(key)} aria-label={`${key}, ${dayPosts.length} updates`} className={`group relative aspect-square overflow-hidden rounded-xl text-left transition sm:rounded-2xl ${active ? "ring-3 ring-stone-950 ring-offset-2" : "bg-[#f8f6f1] hover:-translate-y-0.5 hover:shadow-md"}`}>
                    {preview?.imageDataUrl && <div className="absolute inset-0 bg-cover bg-center opacity-75 transition group-hover:scale-105" style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.58), rgba(0,0,0,.04)), url("${preview.imageDataUrl}")` }} />}
                    <span className={`absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-black sm:left-3 sm:top-3 ${key === today ? "bg-[#ffd84d] text-stone-950" : preview ? "bg-black/35 text-white backdrop-blur" : "text-stone-500"}`}>{day}</span>
                    {dayPosts.length > 0 && <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 sm:bottom-3 sm:left-3 sm:right-3">{dayPosts.slice(0, 3).map((post) => <span key={post.id} className="h-2 flex-1 rounded-full shadow-sm" style={{ backgroundColor: missionColor(post.missionTitle) }} />)}{dayPosts.length > 3 && <span className="text-[8px] font-black text-white">+{dayPosts.length - 3}</span>}</div>}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[2rem] bg-[#211d35] p-5 text-white shadow-[0_22px_70px_rgba(38,32,22,.13)] sm:p-6 xl:sticky xl:top-24 xl:h-fit">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#bba9ff]">DAY NOTE</p>
            <h2 className="mt-2 text-2xl font-black">{selectedDay ? new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }).format(new Date(`${selectedDay}T12:00:00+09:00`)) : "날짜를 골라 보세요"}</h2>
            {!selectedDay && <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center"><p className="text-4xl">☝</p><p className="mt-3 text-xs font-bold leading-5 text-white/35">캘린더의 날짜를 누르면<br />그날의 기록이 여기에 열려요.</p></div>}
            {selectedDay && selectedPosts.length === 0 && <div className="mt-8 rounded-2xl bg-white/[0.06] px-5 py-9 text-center"><p className="text-3xl">·</p><p className="mt-2 text-xs font-bold text-white/35">이날은 아직 기록이 없어요.</p><Link href="/update#new-post" className="mt-5 inline-flex rounded-full bg-[#ffd84d] px-4 py-2.5 text-xs font-black text-stone-950">기록 남기기</Link></div>}
            {selectedPosts.length > 0 && <div className="mt-5 space-y-3">{selectedPosts.map((post) => { const status = getPostStatus(post.status); return <Link key={post.id} href={`/update#post-${post.id}`} className="block overflow-hidden rounded-2xl bg-white/[0.08] ring-1 ring-white/10 transition hover:bg-white/[0.12]">{post.imageDataUrl && <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url("${post.imageDataUrl}")` }} />}<div className="p-4"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-black text-[#cbbcff]">{post.missionTitle ? `🎯 ${post.missionTitle}` : "GENERAL LOG"}</span><span className="shrink-0 text-xs">{status.emoji}</span></div><p className="mt-2 line-clamp-2 text-sm font-bold leading-5">{post.caption}</p><p className="mt-2 text-[10px] font-black text-[#ffd84d]">+{post.scoreAwarded}P</p></div></Link>; })}</div>}
            <div className="mt-6 border-t border-white/10 pt-4 text-xs font-bold text-white/35"><span className="text-white">{completedMissions}</span> missions recorded this month</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
