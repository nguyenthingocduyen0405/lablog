"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  CALENDAR_EVENT_CATEGORIES,
  createCalendarEvent,
  DEFAULT_AVATAR_CONFIG,
  deleteCalendarEvent,
  getMemberAvailability,
  loadCalendarEvents,
  loadLabMembers,
  seoulDateKey,
  type CalendarEvent,
  type CalendarEventCategory,
  type LabMember,
} from "../lib/lab-social";

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function categoryInfo(category: CalendarEventCategory) {
  return CALENDAR_EVENT_CATEGORIES.find((item) => item.value === category) ?? CALENDAR_EVENT_CATEGORIES[4];
}

function formatRange(event: CalendarEvent) {
  const formatter = new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" });
  const start = formatter.format(new Date(`${event.startsOn}T12:00:00+09:00`));
  const end = formatter.format(new Date(`${event.endsOn}T12:00:00+09:00`));
  return event.startsOn === event.endsOn ? start : `${start} — ${end}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const today = seoulDateKey(new Date());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState<CalendarEventCategory | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!cancelled) setUser(currentUser);
      const [loadedEvents, loadedMembers] = await Promise.all([loadCalendarEvents(), loadLabMembers()]);
      if (cancelled) return;
      setEvents(loadedEvents);
      setMembers(loadedMembers);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("팀 캘린더를 불러오지 못했어요. Supabase migration을 확인해 주세요.");
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthStart = dateKey(year, month, 1);
  const monthEnd = dateKey(year, month, daysInMonth);
  const filteredEvents = useMemo(() => categoryFilter === "all" ? events : events.filter((event) => event.category === categoryFilter), [categoryFilter, events]);
  const monthEvents = useMemo(() => filteredEvents.filter((event) => event.startsOn <= monthEnd && event.endsOn >= monthStart), [filteredEvents, monthEnd, monthStart]);
  const selectedEvents = useMemo(() => filteredEvents.filter((event) => event.startsOn <= selectedDay && event.endsOn >= selectedDay), [filteredEvents, selectedDay]);
  const activeMembers = new Set(monthEvents.map((event) => event.userId)).size;
  const myMonthEvents = user ? monthEvents.filter((event) => event.userId === user.id).length : 0;
  const todayAvailabilities = members.map((member) => ({ member, availability: getMemberAvailability(events, member.id, today) })).filter((item) => item.availability);

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setVisibleMonth(next);
    setSelectedDay(dateKey(next.getFullYear(), next.getMonth(), 1));
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title")).trim();
    const description = String(data.get("description")).trim();
    const category = String(data.get("category")) as CalendarEventCategory;
    const startsOn = String(data.get("startsOn"));
    const endsOn = String(data.get("endsOn"));
    if (!title || !startsOn || !endsOn || endsOn < startsOn || !CALENDAR_EVENT_CATEGORIES.some((item) => item.value === category)) {
      setError("일정 이름과 올바른 날짜 범위를 확인해 주세요.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const created = await createCalendarEvent({ userId: user.id, title, description, category, startsOn, endsOn });
      setEvents((current) => [...current, created].sort((a, b) => a.startsOn.localeCompare(b.startsOn)));
      setVisibleMonth(new Date(`${startsOn}T12:00:00`));
      setSelectedDay(startsOn);
      setShowCreate(false);
      form.reset();
    } catch {
      setError("일정을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeEvent(calendarEvent: CalendarEvent) {
    if (!user || calendarEvent.userId !== user.id || !window.confirm("이 일정을 삭제할까요?")) return;
    setError("");
    try {
      await deleteCalendarEvent(calendarEvent.id, user.id);
      setEvents((current) => current.filter((item) => item.id !== calendarEvent.id));
    } catch {
      setError("일정을 삭제하지 못했어요.");
    }
  }

  if (isLoading || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">TEAM CALENDAR LOADING...</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">SHARED SCHEDULE</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">팀 캘린더</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-stone-400">여행, 학회, 휴가와 중요한 마감을 공유하고 서로의 일정을 미리 확인해요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.05]"><p className="text-xl font-black">{monthEvents.length}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">이번 달 일정</p></div>
            <div className="rounded-2xl bg-violet-100 px-4 py-3 ring-1 ring-violet-200"><p className="text-xl font-black">{activeMembers}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-500">공유 멤버</p></div>
            <div className="rounded-2xl bg-[#fff4bd] px-4 py-3 ring-1 ring-amber-200"><p className="text-xl font-black">{myMonthEvents}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-500">내 일정</p></div>
            <button type="button" onClick={() => { setError(""); setShowCreate(true); }} className="rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#c59f00] transition hover:-translate-y-0.5">+ 일정 공유</button>
          </div>
        </div>

        {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

        <section className="mt-7 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">TODAY IN THE LAB</p><h2 className="mt-1 text-xl font-black">오늘의 팀 상태</h2></div><p className="text-xs font-bold text-stone-400">Calendar 일정에서 자동으로 표시돼요.</p></div>
          {todayAvailabilities.length > 0 ? <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{todayAvailabilities.map(({ member, availability }) => availability && <div key={member.id} className="flex shrink-0 items-center gap-2 rounded-full bg-stone-50 py-1.5 pl-1.5 pr-3 ring-1 ring-black/[0.06]"><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={32} /><span className="text-xs font-black">{member.name}</span><span className="rounded-full px-2 py-1 text-[9px] font-black text-stone-950" style={{ backgroundColor: availability.color }}>{availability.emoji} {availability.label}</span></div>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-center text-xs font-bold text-stone-400">오늘 공유된 재실 상태가 없어요.</p>}
        </section>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setCategoryFilter("all")} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${categoryFilter === "all" ? "bg-stone-950 text-white" : "bg-white text-stone-500 ring-1 ring-black/[0.06]"}`}>전체 일정</button>
          {CALENDAR_EVENT_CATEGORIES.map((category) => <button key={category.value} type="button" onClick={() => setCategoryFilter(category.value)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${categoryFilter === category.value ? "text-stone-950 shadow-sm" : "bg-white text-stone-500 ring-1 ring-black/[0.06]"}`} style={categoryFilter === category.value ? { backgroundColor: category.color } : undefined}>{category.emoji} {category.label}</button>)}
        </div>

        <div className="mt-3 grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <section className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_22px_70px_rgba(38,32,22,.09)] ring-1 ring-black/[0.05] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">TEAM MONTH</p><h2 className="mt-1 text-2xl font-black">{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(visibleMonth)}</h2></div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-black hover:bg-stone-200">‹</button><button type="button" onClick={() => { setVisibleMonth(new Date()); setSelectedDay(today); }} className="rounded-full bg-[#ffd84d] px-4 py-2.5 text-xs font-black">오늘</button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-black hover:bg-stone-200">›</button></div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-1 sm:gap-2">
              {weekdays.map((day, index) => <div key={day} className={`pb-1 text-center text-[10px] font-black ${index > 4 ? "text-violet-400" : "text-stone-300"}`}>{day}</div>)}
              {calendarCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="min-h-20 sm:min-h-28" />;
                const key = dateKey(year, month, day);
                const dayEvents = filteredEvents.filter((event) => event.startsOn <= key && event.endsOn >= key);
                const active = selectedDay === key;
                return (
                  <button key={key} type="button" onClick={() => setSelectedDay(key)} className={`relative min-h-20 overflow-hidden rounded-xl p-1.5 text-left transition sm:min-h-28 sm:rounded-2xl sm:p-2.5 ${active ? "bg-[#fff9df] ring-2 ring-stone-950" : "bg-[#f8f6f1] hover:-translate-y-0.5 hover:shadow-md"}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${key === today ? "bg-[#ffd84d]" : "text-stone-500"}`}>{day}</span>
                    <div className="mt-1 space-y-1">{dayEvents.slice(0, 3).map((calendarEvent) => { const category = categoryInfo(calendarEvent.category); return <span key={calendarEvent.id} className="block truncate rounded-md px-1.5 py-1 text-[8px] font-black text-stone-950 sm:rounded-lg sm:text-[10px]" style={{ backgroundColor: category.color }}>{category.emoji} <span className="hidden sm:inline">{calendarEvent.title}</span></span>; })}{dayEvents.length > 3 && <span className="block px-1 text-[8px] font-black text-stone-400">+{dayEvents.length - 3}</span>}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[2rem] bg-[#211d35] p-5 text-white shadow-[0_22px_70px_rgba(38,32,22,.13)] sm:p-6 xl:sticky xl:top-24 xl:h-fit">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#bba9ff]">DAY SCHEDULE</p>
            <h2 className="mt-2 text-2xl font-black">{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }).format(new Date(`${selectedDay}T12:00:00+09:00`))}</h2>
            {selectedEvents.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center"><p className="text-4xl">☕</p><p className="mt-3 text-xs font-bold leading-5 text-white/35">공유된 일정이 없는 날이에요.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-full bg-[#ffd84d] px-4 py-2.5 text-xs font-black text-stone-950">이날 일정 추가</button></div> : <div className="mt-5 space-y-3">{selectedEvents.map((calendarEvent) => { const owner = members.find((member) => member.id === calendarEvent.userId); const category = categoryInfo(calendarEvent.category); return <article key={calendarEvent.id} className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black text-stone-950" style={{ backgroundColor: category.color }}>{category.emoji} {category.label}</span><h3 className="mt-3 font-black leading-5">{calendarEvent.title}</h3></div>{calendarEvent.userId === user.id && <button type="button" onClick={() => removeEvent(calendarEvent)} className="shrink-0 text-[10px] font-black text-red-300 hover:text-red-200">삭제</button>}</div><p className="mt-2 text-xs font-bold text-[#ffd84d]">{formatRange(calendarEvent)}</p>{calendarEvent.description && <p className="mt-3 text-xs font-medium leading-5 text-white/55">{calendarEvent.description}</p>}<div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3"><CharacterAvatar config={owner?.avatarConfig ?? DEFAULT_AVATAR_CONFIG} background={owner?.avatarBackground ?? "#e7e5e4"} name={owner?.name ?? "Lab member"} size={28} /><span className="text-xs font-black text-white/60">{owner?.name ?? "Lab member"}</span></div></article>; })}</div>}
          </aside>
        </div>
      </div>

      {showCreate && (
        <div role="dialog" aria-modal="true" aria-labelledby="new-event-title" onClick={() => setShowCreate(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f5f3ee] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">SHARE SCHEDULE</p><h2 id="new-event-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">팀에 일정 알리기</h2></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close event form" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button></div>
            <form onSubmit={submitEvent} className="mt-7 space-y-5">
              <label className="block"><span className="text-xs font-black text-stone-500">일정 이름</span><input name="title" required maxLength={100} placeholder="예: 제주도 여행" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label>
              <fieldset><legend className="text-xs font-black text-stone-500">종류</legend><div className="mt-2 flex flex-wrap gap-2">{CALENDAR_EVENT_CATEGORIES.map((category, index) => <label key={category.value} className="cursor-pointer"><input type="radio" name="category" value={category.value} defaultChecked={index === 0} className="peer sr-only" /><span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-black/10 peer-checked:ring-2 peer-checked:ring-stone-950" style={{ color: category.color }}>{category.emoji} {category.label}</span></label>)}</div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-black text-stone-500">시작일</span><input name="startsOn" type="date" required defaultValue={selectedDay} className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label><label><span className="text-xs font-black text-stone-500">종료일</span><input name="endsOn" type="date" required defaultValue={selectedDay} className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label></div>
              <label className="block"><span className="text-xs font-black text-stone-500">메모 <span className="font-semibold text-stone-300">(선택)</span></span><textarea name="description" maxLength={300} placeholder="팀원들이 알아야 할 내용을 적어 주세요." className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label>
              <button type="submit" disabled={isSaving} className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#b89500] disabled:opacity-50">{isSaving ? "공유 중..." : "일정 공유"}</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
