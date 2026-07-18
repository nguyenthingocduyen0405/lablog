"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import JitsiRoom from "../components/jitsi-room";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { createOnlineMeeting, deleteOnlineMeeting, loadLabMembers, loadOnlineMeetings, type LabMember, type OnlineMeeting } from "../lib/lab-social";

function localInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function meetingTime(meeting: OnlineMeeting) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(meeting.startsAt));
}

export default function MeetingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [meetings, setMeetings] = useState<OnlineMeeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<OnlineMeeting | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [defaultStart, setDefaultStart] = useState(() => localInputValue(new Date(Date.now() + 30 * 60_000)));
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      const [loadedMeetings, loadedMembers] = await Promise.all([loadOnlineMeetings(), loadLabMembers()]);
      if (cancelled) return;
      setUser(currentUser);
      setMeetings(loadedMeetings);
      setMembers(loadedMembers);
    }).catch(() => setMessage("온라인 회의를 불러오지 못했어요. Supabase migration을 확인해 주세요."));
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const liveMeetings = useMemo(() => meetings.filter((meeting) => { const start = Date.parse(meeting.startsAt); return clock >= start - 15 * 60_000 && clock <= start + meeting.durationMinutes * 60_000; }), [clock, meetings]);
  const upcomingMeetings = meetings.filter((meeting) => !liveMeetings.some((live) => live.id === meeting.id));

  function openCreate(instant = false) {
    setDefaultStart(localInputValue(new Date(Date.now() + (instant ? 0 : 30) * 60_000)));
    setMessage("");
    setShowCreate(true);
  }

  async function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title")).trim();
    const description = String(data.get("description")).trim();
    const startsAtValue = String(data.get("startsAt"));
    const durationMinutes = Number(data.get("durationMinutes"));
    if (!title || !startsAtValue || !Number.isInteger(durationMinutes)) return;
    setIsSaving(true);
    setMessage("");
    try {
      const created = await createOnlineMeeting({ creatorId: user.id, title, description, startsAt: new Date(startsAtValue).toISOString(), durationMinutes });
      setMeetings((current) => [...current, created].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
      setShowCreate(false);
      form.reset();
      if (Date.parse(created.startsAt) <= Date.now() + 60_000) setActiveMeeting(created);
      else setMessage("온라인 회의를 예약했어요.");
    } catch {
      setMessage("회의를 만들지 못했어요. online_meetings migration을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMeeting(meeting: OnlineMeeting) {
    if (!user || meeting.creatorId !== user.id || !window.confirm("이 회의를 삭제할까요?")) return;
    try {
      await deleteOnlineMeeting(meeting.id, user.id);
      setMeetings((current) => current.filter((item) => item.id !== meeting.id));
    } catch { setMessage("회의를 삭제하지 못했어요."); }
  }

  async function copyLink(meeting: OnlineMeeting) {
    try { await navigator.clipboard.writeText(`https://meet.jit.si/${meeting.roomName}`); setMessage("회의 링크를 복사했어요."); }
    catch { setMessage("링크를 복사하지 못했어요."); }
  }

  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">MEETING LOADING...</p></main>;

  const MeetingCard = ({ meeting, live = false }: { meeting: OnlineMeeting; live?: boolean }) => {
    const creator = members.find((member) => member.id === meeting.creatorId);
    return <article className={`rounded-[1.5rem] p-5 ${live ? "bg-[#201d18] text-white shadow-[0_18px_55px_rgba(30,25,15,.22)]" : "bg-white shadow-sm ring-1 ring-black/[0.05]"}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-black uppercase tracking-[.18em] ${live ? "text-emerald-300" : "text-violet-500"}`}>{live ? "● JOIN NOW" : "UPCOMING"}</p><h3 className="mt-2 text-xl font-black">{meeting.title}</h3><p className={`mt-2 text-xs font-bold ${live ? "text-white/45" : "text-stone-400"}`}>{meetingTime(meeting)} · {meeting.durationMinutes}분</p></div>{meeting.creatorId === user.id && <button type="button" onClick={() => removeMeeting(meeting)} className="text-[10px] font-black text-red-400">삭제</button>}</div>{meeting.description && <p className={`mt-3 text-sm font-medium leading-6 ${live ? "text-white/55" : "text-stone-500"}`}>{meeting.description}</p>}<div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${live ? "border-white/10" : "border-stone-100"}`}><div className="flex items-center gap-2"><CharacterAvatar config={creator?.avatarConfig ?? user.avatarConfig} background={creator?.avatarBackground ?? user.avatarBackground} name={creator?.name ?? user.name} size={32} /><span className={`text-xs font-black ${live ? "text-white/60" : "text-stone-500"}`}>{creator?.name ?? user.name}</span></div><div className="flex gap-2"><button type="button" onClick={() => copyLink(meeting)} className={`rounded-full px-3 py-2 text-xs font-black ${live ? "bg-white/10 text-white/65" : "bg-stone-100 text-stone-500"}`}>링크 복사</button><button type="button" onClick={() => setActiveMeeting(meeting)} className={`rounded-full px-4 py-2 text-xs font-black ${live ? "bg-emerald-300 text-emerald-950" : "bg-[#ffd84d] text-stone-950"}`}>참여하기</button></div></div></article>;
  };

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-500">ONLINE COLLABORATION</p><h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">온라인 미팅</h1><p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-stone-400">랩 멤버들과 바로 화상 회의를 시작하거나 시간을 정해 공유해요.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openCreate(false)} className="rounded-full bg-white px-5 py-3.5 text-sm font-black text-stone-600 shadow-sm ring-1 ring-black/[0.06]">+ 회의 예약</button><button type="button" onClick={() => openCreate(true)} className="rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#2d9a73]">🎥 지금 회의 시작</button></div></div>
        {message && <p className="mt-5 rounded-2xl bg-[#fff4bd] px-4 py-3 text-sm font-bold text-stone-700">{message}</p>}
        <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">LIVE ROOMS</p><h2 className="mt-1 text-2xl font-black">지금 참여할 수 있어요</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">{liveMeetings.length}개</span></div>{liveMeetings.length > 0 ? <div className="mt-4 grid gap-4 md:grid-cols-2">{liveMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} live />)}</div> : <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-300 px-5 py-10 text-center"><p className="text-3xl">🎧</p><p className="mt-3 text-sm font-bold text-stone-400">진행 중인 회의가 없어요.</p></div>}</section>
        <section className="mt-10 border-t border-black/[0.08] pt-8"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">SCHEDULED</p><h2 className="mt-1 text-2xl font-black">예정된 회의</h2></div>{upcomingMeetings.length > 0 ? <div className="mt-4 grid gap-4 md:grid-cols-2">{upcomingMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div> : <p className="mt-4 rounded-[1.5rem] bg-white px-5 py-10 text-center text-sm font-bold text-stone-400 ring-1 ring-black/[0.05]">예약된 회의가 없어요.</p>}</section>
        <p className="mt-8 text-center text-[11px] font-semibold leading-5 text-stone-400">영상 회의는 Jitsi Meet을 사용해요. 첫 참여자는 Jitsi에서 로그인하거나 moderator를 기다려야 할 수 있어요.</p>
      </div>

      {showCreate && <div role="dialog" aria-modal="true" aria-labelledby="new-meeting-title" onClick={() => setShowCreate(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><section onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-[2rem] bg-[#f5f3ee] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">NEW ONLINE MEETING</p><h2 id="new-meeting-title" className="mt-2 text-3xl font-black tracking-[-.04em]">온라인 회의 만들기</h2></div><button type="button" onClick={() => setShowCreate(false)} aria-label="회의 만들기 닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button></div><form key={defaultStart} onSubmit={submitMeeting} className="mt-7 space-y-5"><label className="block"><span className="text-xs font-black text-stone-500">회의 이름</span><input name="title" required maxLength={100} placeholder="예: 주간 프로젝트 체크인" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-black text-stone-500">시작 시간</span><input name="startsAt" type="datetime-local" required defaultValue={defaultStart} className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><label><span className="text-xs font-black text-stone-500">예상 시간</span><select name="durationMinutes" defaultValue="60" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400"><option value="30">30분</option><option value="60">1시간</option><option value="90">1시간 30분</option><option value="120">2시간</option></select></label></div><label className="block"><span className="text-xs font-black text-stone-500">안건 <span className="font-semibold text-stone-300">(선택)</span></span><textarea name="description" maxLength={300} placeholder="회의에서 함께 이야기할 내용을 적어 주세요." className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><button type="submit" disabled={isSaving} className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#2d9a73] disabled:opacity-50">{isSaving ? "만드는 중..." : "회의 만들기"}</button></form></section></div>}
      {activeMeeting && <JitsiRoom roomName={activeMeeting.roomName} title={activeMeeting.title} userName={user.name} userEmail={user.email} onClose={() => setActiveMeeting(null)} />}
    </main>
  );
}
