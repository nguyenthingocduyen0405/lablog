"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import JitsiRoom from "../components/jitsi-room";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  createTeamProject,
  endProjectMeeting,
  loadLabMembers,
  loadOnlineMeetings,
  loadTeamProjectInvites,
  loadTeamProjectMembers,
  loadTeamProjects,
  respondToTeamProjectInvite,
  startProjectMeeting,
  type LabMember,
  type OnlineMeeting,
  type TeamProject,
  type TeamProjectInvite,
  type TeamProjectMember,
} from "../lib/lab-social";

export default function MeetingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [projectMembers, setProjectMembers] = useState<TeamProjectMember[]>([]);
  const [invites, setInvites] = useState<TeamProjectInvite[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [liveMeeting, setLiveMeeting] = useState<OnlineMeeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<OnlineMeeting | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      const [loadedProjects, loadedInvites, loadedMembers] = await Promise.all([
        loadTeamProjects(currentUser.id),
        loadTeamProjectInvites(currentUser.id),
        loadLabMembers(),
      ]);
      if (cancelled) return;
      setUser(currentUser);
      setProjects(loadedProjects);
      setInvites(loadedInvites);
      setMembers(loadedMembers);
      setSelectedProjectId(loadedProjects[0]?.id ?? "");
      setProjectMembers(await loadTeamProjectMembers(loadedProjects.map((project) => project.id)));
    }).catch(() => setMessage("Team Project를 불러오지 못했어요. Supabase migration을 확인해 주세요."));
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    const syncMeeting = () => loadOnlineMeetings(selectedProjectId).then((items) => {
      if (cancelled) return;
      const meeting = items[0] ?? null;
      setLiveMeeting(meeting);
      if (!meeting) setActiveMeeting((current) => current?.projectId === selectedProjectId ? null : current);
    });
    syncMeeting().catch(() => { if (!cancelled) setMessage("라이브 회의를 불러오지 못했어요."); });
    const interval = window.setInterval(() => syncMeeting().catch(() => undefined), 15_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedMembers = projectMembers.filter((member) => member.projectId === selectedProjectId);
  const isHost = Boolean(user && selectedProject?.ownerId === user.id);

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
    const name = String(data.get("name")).trim();
    const description = String(data.get("description")).trim();
    if (!name) return;
    setIsSaving(true);
    setMessage("");
    try {
      const created = await createTeamProject(name, description, selectedFriendIds);
      await refreshProjects(user, created.id);
      setShowCreate(false);
      setSelectedFriendIds([]);
      form.reset();
      setMessage(`${selectedFriendIds.length}명의 멤버와 Team Project를 만들었어요.`);
    } catch { setMessage("Team Project를 만들지 못했어요. migration을 확인해 주세요."); }
    finally { setIsSaving(false); }
  }

  async function respond(invite: TeamProjectInvite, response: "accepted" | "declined") {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await respondToTeamProjectInvite(invite.project.id, response, user.id);
      await refreshProjects(user, response === "accepted" ? invite.project.id : undefined);
      setMessage(response === "accepted" ? "Team Project에 참여했어요." : "초대를 거절했어요.");
    } catch { setMessage("초대에 응답하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  async function startMeeting() {
    if (!selectedProject || !isHost || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const meeting = await startProjectMeeting(selectedProject.id, `${selectedProject.name} 팀 미팅`);
      setLiveMeeting(meeting);
      setActiveMeeting(meeting);
    } catch { setMessage("이미 진행 중인 회의가 있거나 host 권한이 없어요."); }
    finally { setIsSaving(false); }
  }

  async function endMeeting() {
    if (!activeMeeting || !isHost) { setActiveMeeting(null); return; }
    setIsSaving(true);
    try {
      await endProjectMeeting(activeMeeting.id, activeMeeting.projectId);
      setActiveMeeting(null);
      setLiveMeeting(null);
      setMessage("Host가 회의를 종료했어요.");
    } catch { setMessage("회의를 종료하지 못했어요."); }
    finally { setIsSaving(false); }
  }

  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">TEAM PROJECT LOADING...</p></main>;

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-500">TEAM COLLABORATION</p><h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">Team Project</h1><p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-stone-400">프로젝트 멤버와 함께 일하고, host가 필요할 때 라이브 회의를 열어요.</p></div><button type="button" onClick={() => { setSelectedFriendIds([]); setShowCreate(true); }} className="w-fit rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#2d9a73]">+ Team Project 만들기</button></div>
        {message && <p className="mt-5 rounded-2xl bg-[#fff4bd] px-4 py-3 text-sm font-bold text-stone-700">{message}</p>}

        {invites.length > 0 && <section className="mt-7 rounded-[1.75rem] bg-[#ffd84d] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-stone-600">PROJECT INVITES · {invites.length}</p><div className="mt-3 grid gap-3 md:grid-cols-2">{invites.map((invite) => <article key={invite.project.id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/10"><p className="text-xs font-bold text-stone-500">{invite.hostName}님이 초대했어요</p><h2 className="mt-1 text-lg font-black">{invite.project.name}</h2><p className="mt-2 text-xs font-semibold text-stone-500">{invite.project.description}</p><div className="mt-4 flex gap-2"><button type="button" disabled={isSaving} onClick={() => respond(invite, "accepted")} className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white">참여하기</button><button type="button" disabled={isSaving} onClick={() => respond(invite, "declined")} className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-500">거절</button></div></article>)}</div></section>}

        <div className="mt-8 grid gap-5 lg:grid-cols-[.38fr_.62fr]">
          <aside className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">MY PROJECTS</p><h2 className="mt-1 text-xl font-black">프로젝트</h2></div><span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700">{projects.length}</span></div><div className="mt-4 space-y-2">{projects.length === 0 ? <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center text-xs font-bold text-stone-400">아직 Team Project가 없어요.</p> : projects.map((project) => <button key={project.id} type="button" onClick={() => setSelectedProjectId(project.id)} className={`w-full rounded-2xl p-4 text-left transition ${selectedProjectId === project.id ? "bg-stone-950 text-white" : "bg-[#f8f6f1] hover:bg-stone-100"}`}><span className="block text-sm font-black">{project.name}</span><span className={`mt-1 block line-clamp-2 text-xs font-semibold ${selectedProjectId === project.id ? "text-white/40" : "text-stone-400"}`}>{project.description || "함께 만드는 Team Project"}</span></button>)}</div></aside>

          <section className="rounded-[2rem] bg-[#201d18] p-5 text-white shadow-[0_22px_70px_rgba(38,32,22,.16)] sm:p-7">{selectedProject ? <><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{isHost ? "HOST PROJECT" : "MEMBER PROJECT"}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{selectedProject.name}</h2><p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/45">{selectedProject.description || "팀원들과 목표를 공유하고 함께 진행해요."}</p></div>{liveMeeting ? <span className="w-fit rounded-full bg-emerald-300/15 px-3 py-2 text-xs font-black text-emerald-300">● 회의 진행 중</span> : <span className="w-fit rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/40">회의 없음</span>}</div><div className="mt-6 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><p className="text-xs font-black text-white/55">PROJECT MEMBERS</p><span className="text-[10px] font-bold text-white/30">{selectedMembers.filter((member) => member.status === "accepted").length}명 참여</span></div><div className="mt-3 flex flex-wrap gap-2">{selectedMembers.map((projectMember) => <div key={projectMember.userId} className={`flex items-center gap-2 rounded-full bg-white/[0.08] py-1.5 pl-1.5 pr-3 ${projectMember.status === "invited" ? "opacity-40" : ""}`}><CharacterAvatar config={projectMember.member.avatarConfig} background={projectMember.member.avatarBackground} name={projectMember.member.name} size={32} /><span className="text-xs font-black">{projectMember.member.name}</span>{projectMember.role === "host" && <span className="text-[9px] font-black text-[#ffd84d]">HOST</span>}</div>)}</div></div><div className="mt-7 rounded-[1.5rem] bg-white/[0.07] p-5 ring-1 ring-white/10"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd84d]">LIVE MEETING</p>{liveMeeting ? <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl font-black">{liveMeeting.title}</h3><p className="mt-1 text-xs font-semibold text-white/40">Host가 종료할 때까지 계속 열려 있어요.</p></div><div className="flex gap-2"><button type="button" onClick={() => window.open(`https://meet.jit.si/${liveMeeting.roomName}`, "_blank", "noopener,noreferrer")} className="rounded-full bg-white/10 px-4 py-3 text-xs font-black text-white/65">새 창</button><button type="button" onClick={() => setActiveMeeting(liveMeeting)} className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950">회의 참여</button></div></div> : <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl font-black">현재 진행 중인 회의가 없어요.</h3><p className="mt-1 text-xs font-semibold text-white/40">시간 제한 없이 host가 시작하고 종료해요.</p></div>{isHost ? <button type="button" onClick={startMeeting} disabled={isSaving} className="rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-black text-stone-950 disabled:opacity-40">🎥 회의 시작</button> : <span className="text-xs font-bold text-white/30">Host가 회의를 열면 참여할 수 있어요.</span>}</div>}</div></> : <div className="flex min-h-96 flex-col items-center justify-center text-center"><p className="text-5xl">🤝</p><h2 className="mt-5 text-2xl font-black">Team Project를 만들어 보세요.</h2><p className="mt-2 text-sm font-semibold text-white/35">친구를 초대하고 필요할 때 바로 회의를 시작할 수 있어요.</p></div>}</section>
        </div>
      </div>

      {showCreate && <div role="dialog" aria-modal="true" aria-labelledby="new-project-title" onClick={() => setShowCreate(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><section onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f5f3ee] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">NEW TEAM PROJECT</p><h2 id="new-project-title" className="mt-2 text-3xl font-black tracking-[-.04em]">Team Project 만들기</h2></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Team Project 만들기 닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button></div><form onSubmit={submitProject} className="mt-7 space-y-5"><label className="block"><span className="text-xs font-black text-stone-500">프로젝트 이름</span><input name="name" required maxLength={100} placeholder="예: OS 논문 공동 프로젝트" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><label className="block"><span className="text-xs font-black text-stone-500">공동 목표</span><textarea name="description" maxLength={500} placeholder="함께 달성할 목표와 진행 방식을 적어 주세요." className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400" /></label><fieldset><legend className="text-xs font-black text-stone-500">친구 초대</legend><div className="mt-2 max-h-56 space-y-2 overflow-y-auto">{members.filter((member) => member.id !== user.id).map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]"><input type="checkbox" checked={selectedFriendIds.includes(member.id)} onChange={() => setSelectedFriendIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} className="h-5 w-5 accent-emerald-500" /><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={38} /><span><span className="block text-sm font-black">{member.name}</span><span className="text-[10px] font-semibold text-stone-400">{member.role}</span></span></label>)}</div></fieldset><button type="submit" disabled={isSaving} className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#2d9a73] disabled:opacity-50">{isSaving ? "만드는 중..." : "Team Project 시작"}</button></form></section></div>}
      {activeMeeting && <JitsiRoom roomName={activeMeeting.roomName} title={activeMeeting.title} userName={user.name} userEmail={user.email} isHost={isHost} onClose={() => setActiveMeeting(null)} onEnd={endMeeting} />}
    </main>
  );
}
