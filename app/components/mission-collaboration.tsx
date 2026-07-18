"use client";

import { useEffect, useMemo, useState } from "react";
import {
  inviteMembersToMission,
  loadLabMembers,
  loadMissionInvites,
  loadMissionParticipants,
  respondToMissionInvite,
  type LabMember,
  type Mission,
  type MissionInvite,
  type MissionParticipant,
} from "../lib/lab-social";
import CharacterAvatar from "./character-avatar";

export default function MissionCollaboration({ currentUserId, missions, onMissionAccepted }: { currentUserId: string; missions: Mission[]; onMissionAccepted: (mission: Mission) => void }) {
  const [members, setMembers] = useState<LabMember[]>([]);
  const [invites, setInvites] = useState<MissionInvite[]>([]);
  const [participants, setParticipants] = useState<MissionParticipant[]>([]);
  const [inviteMission, setInviteMission] = useState<Mission | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadLabMembers(),
      loadMissionInvites(currentUserId),
      loadMissionParticipants(missions.map((mission) => mission.id)),
    ]).then(([loadedMembers, loadedInvites, loadedParticipants]) => {
      if (cancelled) return;
      setMembers(loadedMembers);
      setInvites(loadedInvites);
      setParticipants(loadedParticipants);
    }).catch(() => { if (!cancelled) setMessage("협업 미션 정보를 불러오지 못했어요."); });
    return () => { cancelled = true; };
  }, [currentUserId, missions]);

  const unavailableIds = useMemo(() => new Set(participants.filter((participant) => participant.missionId === inviteMission?.id).map((participant) => participant.userId)), [inviteMission?.id, participants]);
  const availableFriends = members.filter((member) => member.id !== currentUserId && !unavailableIds.has(member.id));

  async function respond(invite: MissionInvite, response: "accepted" | "declined") {
    if (isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      await respondToMissionInvite(invite.mission.id, response, currentUserId);
      setInvites((current) => current.filter((item) => item.mission.id !== invite.mission.id));
      if (response === "accepted") onMissionAccepted(invite.mission);
      setMessage(response === "accepted" ? "함께할 미션에 참여했어요." : "미션 초대를 거절했어요.");
    } catch {
      setMessage("초대에 응답하지 못했어요. 데이터베이스 migration을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function sendInvites() {
    if (!inviteMission || selectedIds.length === 0 || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      await inviteMembersToMission(inviteMission.id, selectedIds);
      const refreshed = await loadMissionParticipants(missions.map((mission) => mission.id));
      setParticipants(refreshed);
      setMessage(`${selectedIds.length}명에게 미션 초대를 보냈어요.`);
      setInviteMission(null);
      setSelectedIds([]);
    } catch {
      setMessage("초대를 보내지 못했어요. 데이터베이스 migration을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {invites.length > 0 && <section className="rounded-[1.5rem] bg-[#ffd84d] p-4 text-stone-950 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-stone-600">MISSION INVITES · {invites.length}</p><div className="mt-3 grid gap-3 md:grid-cols-2">{invites.map((invite) => <article key={invite.mission.id} className="rounded-2xl bg-white/65 p-4 ring-1 ring-black/10"><p className="text-xs font-bold text-stone-500">{invite.inviterName}님이 함께하고 싶어 해요</p><h3 className="mt-1 font-black">{invite.mission.title}</h3><p className="mt-1 text-xs font-semibold text-stone-500">{invite.mission.durationDays}일 · 하루 +{invite.mission.pointsPerUpdate}P</p><div className="mt-4 flex gap-2"><button type="button" disabled={isSaving} onClick={() => respond(invite, "accepted")} className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white">참여하기</button><button type="button" disabled={isSaving} onClick={() => respond(invite, "declined")} className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-500 ring-1 ring-black/10">거절</button></div></article>)}</div></section>}

      {missions.length > 0 && <section className="rounded-[1.5rem] bg-white/[0.05] p-4 ring-1 ring-white/10 sm:p-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#cbbcff]">DO IT TOGETHER</p><h3 className="mt-1 text-lg font-black">친구와 함께 미션하기</h3></div><div className="mt-4 grid gap-3 md:grid-cols-2">{missions.map((mission) => { const missionParticipants = participants.filter((participant) => participant.missionId === mission.id); const isOwner = mission.userId === currentUserId; return <article key={mission.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] p-3.5"><div className="min-w-0"><p className="truncate text-sm font-black">{mission.title}</p><div className="mt-2 flex items-center gap-1.5">{missionParticipants.length === 0 ? <span className="text-[11px] font-semibold text-white/35">아직 함께하는 멤버가 없어요.</span> : missionParticipants.slice(0, 5).map((participant) => <span key={participant.userId} title={`${participant.member.name} · ${participant.status === "accepted" ? "참여 중" : "초대 중"}`} className={participant.status === "invited" ? "opacity-45" : ""}><CharacterAvatar config={participant.member.avatarConfig} background={participant.member.avatarBackground} name={participant.member.name} size={30} /></span>)}</div></div>{isOwner ? <button type="button" onClick={() => { setInviteMission(mission); setSelectedIds([]); }} className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70 hover:bg-[#ffd84d] hover:text-stone-950">+ 친구 초대</button> : <span className="shrink-0 rounded-full bg-emerald-300/15 px-3 py-2 text-[10px] font-black text-emerald-300">함께 참여 중</span>}</article>; })}</div></section>}
      {message && <p className="text-xs font-bold text-[#ffd84d]">{message}</p>}

      {inviteMission && <div role="dialog" aria-modal="true" aria-labelledby="invite-friends-title" onClick={() => setInviteMission(null)} className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><section onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[2rem] bg-[#f5f3ee] p-6 text-stone-950 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500">INVITE FRIENDS</p><h2 id="invite-friends-title" className="mt-1 text-2xl font-black">함께할 친구 선택</h2><p className="mt-1 text-xs font-semibold text-stone-500">{inviteMission.title}</p></div><button type="button" onClick={() => setInviteMission(null)} aria-label="친구 초대 닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button></div><div className="mt-5 max-h-72 space-y-2 overflow-y-auto">{availableFriends.length === 0 ? <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-stone-400">초대할 수 있는 멤버가 없어요.</p> : availableFriends.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]"><input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => setSelectedIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} className="h-5 w-5 accent-violet-500" /><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={40} /><span><span className="block text-sm font-black">{member.name}</span><span className="text-[11px] font-semibold text-stone-400">{member.role}</span></span></label>)}</div><button type="button" onClick={sendInvites} disabled={selectedIds.length === 0 || isSaving} className="mt-5 w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#b89500] disabled:opacity-40">{isSaving ? "초대 중..." : `${selectedIds.length}명에게 초대 보내기`}</button></section></div>}
    </div>
  );
}
