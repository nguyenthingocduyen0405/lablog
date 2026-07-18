"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import JitsiRoom from "../components/jitsi-room";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  completeTeamProject,
  createTeamProject,
  createTeamProjectTask,
  deleteTeamProjectTask,
  endProjectMeeting,
  loadLabMembers,
  loadOnlineMeetings,
  loadProjectMeetingHistory,
  loadTeamProjectInvites,
  loadTeamProjectMembers,
  loadTeamProjects,
  loadTeamProjectTasks,
  respondToTeamProjectInvite,
  saveProjectMeetingNotes,
  setTeamProjectTaskCompleted,
  startProjectMeeting,
  type LabMember,
  type OnlineMeeting,
  type TeamProject,
  type TeamProjectInvite,
  type TeamProjectMember,
  type TeamProjectTask,
} from "../lib/lab-social";

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return localDateKey(date);
}

function formatDate(value: string) {
  if (!value) return "미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function MeetingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [projectMembers, setProjectMembers] = useState<TeamProjectMember[]>([]);
  const [tasks, setTasks] = useState<TeamProjectTask[]>([]);
  const [invites, setInvites] = useState<TeamProjectInvite[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [liveMeeting, setLiveMeeting] = useState<OnlineMeeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<OnlineMeeting | null>(null);
  const [meetingHistory, setMeetingHistory] = useState<OnlineMeeting[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesStatus, setNotesStatus] = useState<"saved" | "saving" | "error">("saved");
  const notesDirtyRef = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      const [loadedProjects, loadedInvites, loadedMembers] = await Promise.all([
        loadTeamProjects(currentUser.id), loadTeamProjectInvites(currentUser.id), loadLabMembers(),
      ]);
      if (cancelled) return;
      setUser(currentUser);
      setProjects(loadedProjects);
      setInvites(loadedInvites);
      setMembers(loadedMembers);
      setSelectedProjectId(loadedProjects[0]?.id ?? "");
      setProjectMembers(await loadTeamProjectMembers(loadedProjects.map((project) => project.id)));
    }).catch(() => setMessage("Team Project를 불러오지 못했어요. 최신 Supabase migration을 확인해 주세요."));
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    Promise.all([loadTeamProjectTasks(selectedProjectId), loadProjectMeetingHistory(selectedProjectId)])
      .then(([loadedTasks, loadedHistory]) => { if (!cancelled) { setTasks(loadedTasks); setMeetingHistory(loadedHistory); } })
      .catch(() => { if (!cancelled) setMessage("업무 또는 회의 기록을 불러오지 못했어요."); });
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedMembers = projectMembers.filter((member) => member.projectId === selectedProjectId);
  const acceptedMembers = selectedMembers.filter((member) => member.status === "accepted");
  const isHost = Boolean(user && selectedProject?.ownerId === user.id);
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const allTasksComplete = tasks.length > 0 && completedCount === tasks.length;

  const memberById = new Map(selectedMembers.map((item) => [item.userId, item.member]));

  useEffect(() => {
    if (!selectedProjectId || selectedProject?.status === "completed") return;
    let cancelled = false;
    const sync = () => loadOnlineMeetings(selectedProjectId).then((items) => { if (!cancelled) setLiveMeeting(items[0] ?? null); });
    sync().catch(() => undefined);
    const interval = window.setInterval(() => sync().catch(() => undefined), 15_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [selectedProjectId, selectedProject?.status]);

  const displayedLiveMeeting = liveMeeting?.projectId === selectedProjectId && selectedProject?.status === "active" ? liveMeeting : null;
  const activeMeetingId = activeMeeting?.id;

  useEffect(() => {
    if (!activeMeetingId || !notesDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      saveProjectMeetingNotes(activeMeetingId, notesDraft).then((updated) => {
        notesDirtyRef.current = false;
        setNotesStatus("saved");
        setActiveMeeting((current) => current?.id === updated.id ? updated : current);
        setLiveMeeting((current) => current?.id === updated.id ? updated : current);
      }).catch(() => setNotesStatus("error"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeMeetingId, notesDraft]);

  function openMeetingRoom(meeting: OnlineMeeting) {
    notesDirtyRef.current = false;
    setNotesDraft(meeting.notes);
    setNotesStatus("saved");
    setActiveMeeting(meeting);
  }

  function changeMeetingNotes(notes: string) {
    notesDirtyRef.current = true;
    setNotesStatus("saving");
    setNotesDraft(notes);
  }

  async function savePendingMeetingNotes(meeting: OnlineMeeting) {
    if (!notesDirtyRef.current) return meeting;
    const updated = await saveProjectMeetingNotes(meeting.id, notesDraft);
    notesDirtyRef.current = false;
    setNotesStatus("saved");
    return updated;
  }

  async function closeMeetingRoom() {
    if (!activeMeeting) return;
    try { await savePendingMeetingNotes(activeMeeting); setActiveMeeting(null); }
    catch { setNotesStatus("error"); setMessage("회의 내용 저장에 실패해 방을 닫지 않았어요."); }
  }

  async function refreshProjects(currentUser: AuthUser, preferredProjectId?: string) {
    const [loadedProjects, loadedInvites] = await Promise.all([loadTeamProjects(currentUser.id), loadTeamProjectInvites(currentUser.id)]);
    setProjects(loadedProjects);
    setInvites(loadedInvites);
    setProjectMembers(await loadTeamProjectMembers(loadedProjects.map((project) => project.id)));
    setSelectedProjectId(preferredProjectId && loadedProjects.some((project) => project.id === preferredProjectId) ? preferredProjectId : loadedProjects[0]?.id ?? "");
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSaving(true); setMessage("");
    try {
      const created = await createTeamProject(
        String(data.get("name")).trim(), String(data.get("description")).trim(),
        String(data.get("deadline")), Number(data.get("rewardPoints")), selectedFriendIds,
      );
      await refreshProjects(user, created.id);
      setShowCreate(false); setSelectedFriendIds([]); form.reset();
      setMessage("Team Project를 만들고 멤버에게 초대를 보냈어요.");
    } catch { setMessage("프로젝트를 만들지 못했어요. 입력값과 migration을 확인해 주세요."); }
    finally { setIsSaving(false); }
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !isHost || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSaving(true); setMessage("");
    try {
      const created = await createTeamProjectTask({
        projectId: selectedProject.id, title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(), assigneeId: String(data.get("assigneeId")),
        dueOn: String(data.get("dueOn")),
      });
      setTasks((current) => [...current, created].sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
      setShowTaskForm(false); form.reset(); setMessage("새 업무를 배정했어요.");
    } catch { setMessage("업무를 추가하지 못했어요. 담당자와 deadline을 확인해 주세요."); }
    finally { setIsSaving(false); }
  }

  async function toggleTask(task: TeamProjectTask) {
    if (!user || isSaving || (task.assigneeId !== user.id && !isHost)) return;
    setIsSaving(true);
    try {
      const updated = await setTeamProjectTaskCompleted(task.id, !task.completed);
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    } catch { setMessage("업무 상태를 변경하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  async function removeTask(taskId: string) {
    if (!isHost || isSaving) return;
    setIsSaving(true);
    try { await deleteTeamProjectTask(taskId); setTasks((current) => current.filter((item) => item.id !== taskId)); }
    catch { setMessage("업무를 삭제하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  async function finishProject() {
    if (!user || !selectedProject || !isHost || !allTasksComplete || isSaving) return;
    setIsSaving(true); setMessage("");
    try {
      const completed = await completeTeamProject(selectedProject.id);
      setProjects((current) => current.map((project) => project.id === completed.id ? completed : project));
      setMessage(`프로젝트 완료! 참여한 모든 팀원에게 ${completed.rewardPoints}P를 지급했어요.`);
    } catch { setMessage("모든 업무가 완료되었는지 확인해 주세요."); }
    finally { setIsSaving(false); }
  }

  async function respond(invite: TeamProjectInvite, response: "accepted" | "declined") {
    if (!user || isSaving) return;
    setIsSaving(true);
    try { await respondToTeamProjectInvite(invite.project.id, response, user.id); await refreshProjects(user, response === "accepted" ? invite.project.id : undefined); }
    catch { setMessage("초대에 응답하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  async function startMeeting() {
    if (!selectedProject || !isHost || isSaving) return;
    setIsSaving(true);
    try { const meeting = await startProjectMeeting(selectedProject.id, `${selectedProject.name} 팀 미팅`); setLiveMeeting(meeting); openMeetingRoom(meeting); }
    catch { setMessage("회의를 시작하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  async function endMeeting() {
    if (!activeMeeting || !isHost) { setActiveMeeting(null); return; }
    setIsSaving(true);
    try {
      await savePendingMeetingNotes(activeMeeting);
      await endProjectMeeting(activeMeeting.id, activeMeeting.projectId);
      setActiveMeeting(null); setLiveMeeting(null);
      setMeetingHistory(await loadProjectMeetingHistory(activeMeeting.projectId));
      setMessage("회의가 종료되고 내용 정리가 팀 기록에 보관됐어요.");
    }
    catch { setMessage("회의를 종료하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">TEAM PROJECT LOADING...</p></main>;

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-600">TEAM COLLABORATION</p><h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">Team Project</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-stone-500">업무를 나누고 deadline을 지키며, 프로젝트를 끝내면 팀 전체가 함께 포인트를 받아요.</p></div>
          <button type="button" onClick={() => { setSelectedFriendIds([]); setShowCreate(true); }} className="w-fit rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#2d9a73]">+ Team Project 만들기</button>
        </header>
        {message && <p role="status" className="mt-5 rounded-2xl bg-[#fff4bd] px-4 py-3 text-sm font-bold text-stone-700">{message}</p>}

        {invites.length > 0 && <section className="mt-7 rounded-[1.75rem] bg-[#ffd84d] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-stone-600">PROJECT INVITES · {invites.length}</p><div className="mt-3 grid gap-3 md:grid-cols-2">{invites.map((invite) => <article key={invite.project.id} className="rounded-2xl bg-white/75 p-4 ring-1 ring-black/10"><p className="text-xs font-bold text-stone-500">{invite.hostName}님이 초대했어요</p><h2 className="mt-1 text-lg font-black">{invite.project.name}</h2><p className="mt-2 text-xs font-semibold text-stone-500">마감 {formatDate(invite.project.deadline)} · 완료 보상 {invite.project.rewardPoints}P</p><div className="mt-4 flex gap-2"><button type="button" disabled={isSaving} onClick={() => respond(invite, "accepted")} className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white">참여하기</button><button type="button" disabled={isSaving} onClick={() => respond(invite, "declined")} className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-500">거절</button></div></article>)}</div></section>}

        <div className="mt-8 grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">MY PROJECTS</p><h2 className="mt-1 text-xl font-black">프로젝트</h2></div><span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700">{projects.length}</span></div><div className="mt-4 space-y-2">{projects.length === 0 ? <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center text-xs font-bold text-stone-400">아직 Team Project가 없어요.</p> : projects.map((project) => <button key={project.id} type="button" onClick={() => setSelectedProjectId(project.id)} className={`w-full rounded-2xl p-4 text-left transition ${selectedProjectId === project.id ? "bg-stone-950 text-white" : "bg-[#f8f6f1] hover:bg-stone-100"}`}><span className="flex items-center justify-between gap-2"><span className="text-sm font-black">{project.name}</span><span className={`text-[9px] font-black ${project.status === "completed" ? "text-emerald-400" : "text-[#ffd84d]"}`}>{project.status === "completed" ? "DONE" : `${project.rewardPoints}P`}</span></span><span className={`mt-2 block text-[11px] font-semibold ${selectedProjectId === project.id ? "text-white/45" : "text-stone-400"}`}>마감 {formatDate(project.deadline)}</span></button>)}</div></aside>

          <section>{selectedProject ? <div className="space-y-5">
            <div className="overflow-hidden rounded-[2rem] bg-[#201d18] text-white shadow-[0_22px_70px_rgba(38,32,22,.16)]"><div className="p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{selectedProject.status === "completed" ? "COMPLETED PROJECT" : isHost ? "HOST PROJECT" : "MEMBER PROJECT"}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{selectedProject.name}</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">{selectedProject.description || "팀원들과 목표를 공유하고 함께 진행해요."}</p></div><div className="flex shrink-0 gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-[#ffd84d]">🏆 {selectedProject.rewardPoints}P / 인</span><span className={`rounded-full px-3 py-2 text-xs font-black ${selectedProject.status === "completed" ? "bg-emerald-300 text-emerald-950" : "bg-white/10 text-white/55"}`}>{selectedProject.status === "completed" ? "✓ 완료" : `마감 ${formatDate(selectedProject.deadline)}`}</span></div></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[10px] font-black text-white/35">PROGRESS</p><p className="mt-2 text-2xl font-black">{progress}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${progress}%` }} /></div></div><div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[10px] font-black text-white/35">TASKS</p><p className="mt-2 text-2xl font-black">{completedCount}<span className="text-sm text-white/30"> / {tasks.length}</span></p><p className="mt-3 text-xs font-bold text-white/35">완료한 업무</p></div><div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[10px] font-black text-white/35">TEAM</p><p className="mt-2 text-2xl font-black">{acceptedMembers.length}명</p><div className="mt-3 flex -space-x-2">{acceptedMembers.slice(0, 6).map((item) => <CharacterAvatar key={item.userId} config={item.member.avatarConfig} background={item.member.avatarBackground} name={item.member.name} size={28} className="ring-2 ring-[#201d18]" />)}</div></div></div>
            </div></div>

            <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">TASK BOARD</p><h3 className="mt-1 text-2xl font-black">업무 분담</h3></div>{isHost && selectedProject.status === "active" && <button type="button" onClick={() => setShowTaskForm((value) => !value)} className="w-fit rounded-full bg-violet-100 px-4 py-2.5 text-xs font-black text-violet-700">{showTaskForm ? "닫기" : "+ 업무 배정"}</button>}</div>
              {showTaskForm && <form onSubmit={submitTask} className="mt-5 grid gap-3 rounded-2xl bg-violet-50 p-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-[11px] font-black text-stone-500">업무 이름</span><input name="title" required maxLength={120} placeholder="예: 발표 자료 초안 작성" className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label><label><span className="text-[11px] font-black text-stone-500">담당자</span><select name="assigneeId" required className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10">{acceptedMembers.map((item) => <option key={item.userId} value={item.userId}>{item.member.name}</option>)}</select></label><label><span className="text-[11px] font-black text-stone-500">업무 deadline</span><input type="date" name="dueOn" required min={localDateKey()} max={selectedProject.deadline} defaultValue={selectedProject.deadline} className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10" /></label><label className="sm:col-span-2"><span className="text-[11px] font-black text-stone-500">설명 (선택)</span><textarea name="description" maxLength={500} className="mt-1.5 min-h-20 w-full resize-none rounded-xl bg-white px-3.5 py-3 text-sm font-semibold outline-none ring-1 ring-black/10" /></label><button disabled={isSaving || acceptedMembers.length === 0} className="rounded-full bg-stone-950 px-4 py-3 text-xs font-black text-white sm:col-span-2 disabled:opacity-40">업무 배정하기</button></form>}
              <div className="mt-5 space-y-3">{tasks.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center"><p className="text-3xl">📋</p><p className="mt-3 text-sm font-black text-stone-500">아직 배정된 업무가 없어요.</p><p className="mt-1 text-xs font-semibold text-stone-400">Host가 첫 업무를 만들면 진행률이 시작돼요.</p></div> : tasks.map((task) => { const assignee = memberById.get(task.assigneeId); const canToggle = selectedProject.status === "active" && (task.assigneeId === user.id || isHost); const overdue = !task.completed && task.dueOn < localDateKey(); return <article key={task.id} className={`flex gap-3 rounded-2xl p-4 ring-1 ${task.completed ? "bg-emerald-50 ring-emerald-100" : "bg-[#faf9f6] ring-black/[0.05]"}`}><button type="button" onClick={() => toggleTask(task)} disabled={!canToggle || isSaving} aria-label={task.completed ? "업무 완료 취소" : "업무 완료 표시"} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ring-2 ${task.completed ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-transparent ring-stone-300"} disabled:cursor-not-allowed`}>✓</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className={`text-sm font-black ${task.completed ? "text-stone-400 line-through" : "text-stone-800"}`}>{task.title}</h4>{task.description && <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">{task.description}</p>}</div>{isHost && selectedProject.status === "active" && <button type="button" onClick={() => removeTask(task.id)} className="text-[10px] font-black text-red-400">삭제</button>}</div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[10px] font-black text-stone-600 ring-1 ring-black/[0.06]">{assignee && <CharacterAvatar config={assignee.avatarConfig} background={assignee.avatarBackground} name={assignee.name} size={22} />}{assignee?.name ?? "Member"}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${overdue ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-500"}`}>{overdue ? "⚠ 지연 · " : ""}{formatDate(task.dueOn)}</span></div></div></article>; })}</div>
            </div>

            <div className="grid gap-5 md:grid-cols-2"><div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">TEAM MEMBERS</p><div className="mt-4 space-y-2">{selectedMembers.map((item) => <div key={item.userId} className={`flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ${item.status === "invited" ? "opacity-45" : ""}`}><CharacterAvatar config={item.member.avatarConfig} background={item.member.avatarBackground} name={item.member.name} size={38} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.member.name}</p><p className="text-[10px] font-bold text-stone-400">{item.role === "host" ? "HOST" : item.status === "invited" ? "초대 대기" : "MEMBER"}</p></div></div>)}</div></div>
              <div className="rounded-[1.75rem] bg-stone-950 p-5 text-white shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd84d]">LIVE MEETING</p>{selectedProject.status === "completed" ? <div className="mt-5"><p className="text-2xl">🎉</p><h3 className="mt-3 text-xl font-black">프로젝트가 완료됐어요.</h3><p className="mt-2 text-xs font-semibold leading-5 text-white/40">모든 팀원에게 {selectedProject.rewardPoints}P가 지급되었습니다.</p></div> : displayedLiveMeeting ? <div className="mt-5"><h3 className="text-xl font-black">{displayedLiveMeeting.title}</h3><p className="mt-2 text-xs font-semibold text-emerald-300">● 지금 회의 중</p>{displayedLiveMeeting.notes && <p className="mt-3 line-clamp-3 whitespace-pre-line rounded-xl bg-white/[0.06] p-3 text-xs font-semibold leading-5 text-white/45">{displayedLiveMeeting.notes}</p>}<button type="button" onClick={() => openMeetingRoom(displayedLiveMeeting)} className="mt-5 rounded-full bg-emerald-300 px-5 py-3 text-xs font-black text-emerald-950">회의 참여 · 내용 정리</button></div> : <div className="mt-5"><h3 className="text-xl font-black">진행 중인 회의가 없어요.</h3><p className="mt-2 text-xs font-semibold leading-5 text-white/40">업무를 맞추기 위해 필요할 때 바로 만나요.</p>{isHost && <button type="button" onClick={startMeeting} disabled={isSaving} className="mt-5 rounded-full bg-[#ffd84d] px-5 py-3 text-xs font-black text-stone-950">🎥 회의 시작</button>}</div>}</div></div>

            <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-600">MEETING ARCHIVE</p><h3 className="mt-1 text-2xl font-black">회의 내용 기록</h3><p className="mt-2 text-xs font-semibold text-stone-400">참석하지 못한 팀원도 지난 논의와 결정 사항을 확인할 수 있어요.</p></div><span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">{meetingHistory.length}</span></div><div className="mt-5 space-y-3">{meetingHistory.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-9 text-center"><p className="text-3xl">📝</p><p className="mt-3 text-sm font-black text-stone-500">아직 보관된 회의 기록이 없어요.</p></div> : meetingHistory.map((meeting) => <details key={meeting.id} className="group rounded-2xl bg-[#faf9f6] ring-1 ring-black/[0.05]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4"><div><h4 className="text-sm font-black text-stone-800">{meeting.title}</h4><p className="mt-1 text-[10px] font-bold text-stone-400">{formatDateTime(meeting.startsAt)} · 종료 {formatDateTime(meeting.endedAt)}</p></div><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-stone-400 ring-1 ring-black/[0.06] transition group-open:rotate-45">+</span></summary><div className="border-t border-black/[0.05] px-4 py-5"><p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-stone-600">{meeting.notes || "작성된 회의 내용이 없어요."}</p>{meeting.notesUpdatedAt && <p className="mt-4 text-[10px] font-bold text-stone-300">마지막 저장 {formatDateTime(meeting.notesUpdatedAt)}</p>}</div></details>)}</div></div>

            {isHost && selectedProject.status === "active" && <div className="rounded-[1.75rem] border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 sm:flex sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">PROJECT COMPLETION</p><h3 className="mt-2 text-xl font-black">모든 업무가 끝났나요?</h3><p className="mt-1 text-xs font-semibold text-stone-500">완료를 확정하면 참여한 팀원 모두에게 {selectedProject.rewardPoints}P가 한 번만 지급돼요.</p></div><button type="button" onClick={finishProject} disabled={!allTasksComplete || isSaving} className="mt-4 w-full rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#177c58] disabled:bg-stone-300 disabled:shadow-none sm:mt-0 sm:w-auto">{allTasksComplete ? "프로젝트 완료 + 포인트 지급" : `남은 업무 ${tasks.length - completedCount}개`}</button></div>}
          </div> : <div className="flex min-h-96 flex-col items-center justify-center rounded-[2rem] bg-[#201d18] text-center text-white"><p className="text-5xl">🤝</p><h2 className="mt-5 text-2xl font-black">Team Project를 만들어 보세요.</h2><p className="mt-2 text-sm font-semibold text-white/35">업무와 deadline을 공유하고 함께 보상을 받아요.</p></div>}</section>
        </div>
      </div>

      {showCreate && <div role="dialog" aria-modal="true" aria-labelledby="new-project-title" onClick={() => setShowCreate(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><section onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f5f3ee] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">NEW TEAM PROJECT</p><h2 id="new-project-title" className="mt-2 text-3xl font-black">Team Project 만들기</h2></div><button type="button" onClick={() => setShowCreate(false)} aria-label="닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button></div><form onSubmit={submitProject} className="mt-7 space-y-5"><label className="block"><span className="text-xs font-black text-stone-500">프로젝트 이름</span><input name="name" required maxLength={100} placeholder="예: OS 논문 공동 프로젝트" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><label className="block"><span className="text-xs font-black text-stone-500">공동 목표</span><textarea name="description" maxLength={500} placeholder="팀이 함께 달성할 목표를 적어 주세요." className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-black text-stone-500">프로젝트 deadline</span><input type="date" name="deadline" required min={localDateKey()} defaultValue={defaultDeadline()} className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold ring-1 ring-black/10" /></label><label><span className="text-xs font-black text-stone-500">완료 보상 / 팀원</span><div className="relative"><input type="number" name="rewardPoints" required min={1} max={500} defaultValue={30} className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 pr-10 text-sm font-bold ring-1 ring-black/10" /><span className="absolute right-4 top-1/2 mt-1 text-xs font-black text-stone-400">P</span></div></label></div><fieldset><legend className="text-xs font-black text-stone-500">팀원 초대</legend><div className="mt-2 max-h-52 space-y-2 overflow-y-auto">{members.filter((member) => member.id !== user.id).map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]"><input type="checkbox" checked={selectedFriendIds.includes(member.id)} onChange={() => setSelectedFriendIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} className="h-5 w-5 accent-emerald-500" /><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={38} /><span><span className="block text-sm font-black">{member.name}</span><span className="text-[10px] font-semibold text-stone-400">{member.role}</span></span></label>)}</div></fieldset><button type="submit" disabled={isSaving} className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#2d9a73] disabled:opacity-50">{isSaving ? "만드는 중..." : "Team Project 시작"}</button></form></section></div>}
      {activeMeeting && <JitsiRoom roomName={activeMeeting.roomName} title={activeMeeting.title} userName={user.name} userEmail={user.email} isHost={isHost} notes={notesDraft} notesStatus={notesStatus} onNotesChange={changeMeetingNotes} onClose={closeMeetingRoom} onEnd={endMeeting} />}
    </main>
  );
}
