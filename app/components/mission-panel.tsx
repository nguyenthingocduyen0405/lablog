"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  addMission,
  countMissionUpdateDays,
  hasMissionUpdateToday,
  missionPointsForDuration,
  type MissionActivity,
  type Mission,
} from "../lib/lab-social";
import MissionCollaboration from "./mission-collaboration";

const missionPresets = [
  { title: "하루 1편 논문 · 1주 연속", durationDays: 7, emoji: "📄", color: "bg-[#d9ff72]" },
  { title: "하루 1편 논문 · 2주 연속", durationDays: 14, emoji: "📚", color: "bg-[#b8a4ff]" },
  { title: "1달 프로젝트", durationDays: 30, emoji: "🚀", color: "bg-[#ffd84d]" },
] as const;

type MissionPanelProps = {
  currentUserId: string;
  missions: Mission[];
  posts: MissionActivity[];
  onMissionAdded: (mission: Mission) => void;
};

function MissionProgress({ mission, posts }: { mission: Mission; posts: MissionActivity[] }) {
  const updatedDays = useMemo(() => countMissionUpdateDays(posts, mission.id), [mission.id, posts]);
  const updatedToday = hasMissionUpdateToday(posts, mission.id);
  const progress = Math.min(100, Math.round((updatedDays / mission.durationDays) * 100));

  return (
    <article className="rounded-[1.5rem] bg-white/[0.08] p-5 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">진행 중인 미션</p>
          <h3 className="mt-2 text-lg font-black leading-6">{mission.title}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${updatedToday ? "bg-emerald-300 text-emerald-950" : "bg-white/10 text-white/55"}`}>
          {updatedToday ? "오늘 완료" : "진행 중 · 변경 불가"}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-white/45">{mission.startedOn} — {mission.endsOn} · 하루 +{mission.pointsPerUpdate}P</p>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/55">
          <span>{updatedDays}일 / {mission.durationDays}일</span><span>{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#b59cff] to-[#ffd84d] transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
    </article>
  );
}

export default function MissionPanel({ currentUserId, missions, posts, onMissionAdded }: MissionPanelProps) {
  const [showChooser, setShowChooser] = useState(missions.length === 0);
  const [showCustom, setShowCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function chooseMission(title: string, durationDays: number) {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const nextMission = await addMission(title, durationDays);
      onMissionAdded(nextMission);
      setShowChooser(false);
      setShowCustom(false);
    } catch {
      setError("미션을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCustomMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("missionTitle")).trim();
    const durationDays = Number(data.get("missionDuration"));
    if (!title || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) return;
    await chooseMission(title, durationDays);
    form.reset();
  }

  return (
    <section id="mission" className="overflow-hidden rounded-[1.75rem] bg-[#26203d] text-white shadow-[0_18px_55px_rgba(50,38,90,.18)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cbbcff]">MY MISSIONS</p>
            <h2 className="mt-1 text-2xl font-black">나의 미션</h2>
            <p className="mt-2 text-sm font-semibold text-white/45">시작한 미션은 종료일까지 바꿀 수 없어요. 여러 미션을 함께 진행할 수 있어요.</p>
          </div>
          <button type="button" onClick={() => setShowChooser((current) => !current)} className="w-fit rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5">{showChooser ? "닫기" : "+ 미션 추가"}</button>
        </div>

        {missions.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2">{missions.map((mission) => <MissionProgress key={mission.id} mission={mission} posts={posts} />)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/20 px-5 py-8 text-center text-sm font-bold text-white/40">아직 진행 중인 미션이 없어요.</div>}
        <MissionCollaboration currentUserId={currentUserId} missions={missions} onMissionAccepted={onMissionAdded} />
      </div>

      {showChooser && (
        <div className="border-t border-white/10 bg-black/10 p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cbbcff]">NEW MISSION</p>
          <h2 className="mt-1 text-2xl font-black">새로운 도전을 골라 보세요</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {missionPresets.map((preset) => {
              const alreadyRunning = missions.some((mission) => mission.title === preset.title);
              return (
                <button key={preset.title} type="button" disabled={isSaving || alreadyRunning} onClick={() => chooseMission(preset.title, preset.durationDays)} className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${preset.color}`}>{preset.emoji}</span>
                  <span className="mt-4 block text-sm font-black leading-5">{preset.title}</span>
                  <span className="mt-2 block text-xs font-semibold text-white/40">{preset.durationDays}일 · 하루 +{missionPointsForDuration(preset.durationDays)}P</span>
                  {alreadyRunning && <span className="mt-3 block text-[10px] font-black text-emerald-300">이미 진행 중</span>}
                </button>
              );
            })}
            <button type="button" onClick={() => setShowCustom(true)} className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl text-stone-950">＋</span>
              <span className="mt-4 block text-sm font-black">직접 입력</span>
              <span className="mt-2 block text-xs font-semibold leading-5 text-white/40">나만의 이름과 기간으로 미션을 설계해요.</span>
            </button>
          </div>
          {error && <p className="mt-3 text-xs font-bold text-red-300">{error}</p>}
        </div>
      )}

      {showCustom && (
        <div role="dialog" aria-modal="true" aria-labelledby="custom-mission-title" onClick={() => setShowCustom(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[2rem] bg-[#f5f3ee] p-6 text-stone-950 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">CUSTOM MISSION</p><h3 id="custom-mission-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">나만의 미션 설계</h3></div>
              <button type="button" aria-label="Close custom mission designer" onClick={() => setShowCustom(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl">×</button>
            </div>
            <form onSubmit={submitCustomMission} className="mt-7 space-y-5">
              <label className="block"><span className="text-xs font-black text-stone-500">미션 이름</span><input name="missionTitle" required maxLength={120} placeholder="예: 매일 알고리즘 1문제" className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /></label>
              <label className="block"><span className="text-xs font-black text-stone-500">기간</span><div className="mt-2 flex items-center gap-3"><input name="missionDuration" required type="number" min={1} max={365} defaultValue={7} className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400" /><span className="text-sm font-black text-stone-500">일</span></div></label>
              <p className="rounded-2xl bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-700">시작 후에는 종료일까지 수정하거나 교체할 수 없어요. 기간에 따라 하루 2–10P를 받아요.</p>
              <button type="submit" disabled={isSaving} className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#b89500] disabled:opacity-50">{isSaving ? "저장 중..." : "미션 시작"}</button>
            </form>
            {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
