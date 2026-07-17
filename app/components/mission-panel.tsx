"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  countMissionUpdateDays,
  hasMissionUpdateToday,
  missionPointsForDuration,
  setActiveMission,
  type DailyPost,
  type Mission,
} from "../lib/lab-social";

const missionPresets = [
  { title: "\uD558\uB8E8 1\uD3B8 \uB17C\uBB38 \u00B7 1\uC8FC \uC5F0\uC18D", durationDays: 7, emoji: "\uD83D\uDCC4" },
  { title: "\uD558\uB8E8 1\uD3B8 \uB17C\uBB38 \u00B7 2\uC8FC \uC5F0\uC18D", durationDays: 14, emoji: "\uD83D\uDCDA" },
  { title: "1\uB2EC \uD504\uB85C\uC81D\uD2B8", durationDays: 30, emoji: "\uD83D\uDE80" },
] as const;

type MissionPanelProps = {
  mission: Mission | null;
  posts: DailyPost[];
  onMissionChange: (mission: Mission) => void;
};

export default function MissionPanel({ mission, posts, onMissionChange }: MissionPanelProps) {
  const [showChooser, setShowChooser] = useState(!mission);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const updatedDays = useMemo(
    () => mission ? countMissionUpdateDays(posts, mission.id) : 0,
    [mission, posts],
  );
  const updatedToday = mission ? hasMissionUpdateToday(posts, mission.id) : false;
  const progress = mission ? Math.min(100, Math.round((updatedDays / mission.durationDays) * 100)) : 0;

  async function chooseMission(title: string, durationDays: number) {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const nextMission = await setActiveMission(title, durationDays);
      onMissionChange(nextMission);
      setShowChooser(false);
    } catch {
      setError("\uBBF8\uC158\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
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
    <section id="mission" className="mb-6 overflow-hidden rounded-[1.75rem] bg-[#26203d] text-white shadow-[0_18px_55px_rgba(50,38,90,.18)]">
      {mission && (
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#b59cff] text-3xl text-stone-950">{"\uD83C\uDFAF"}</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{"\uB098\uC758 \uBBF8\uC158"}</p>
                <h2 className="mt-1 text-xl font-black">{mission.title}</h2>
                <p className="mt-1 text-xs font-semibold text-white/50">{mission.startedOn} - {mission.endsOn} · +{mission.pointsPerUpdate}P / day</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/update#new-post" className={`rounded-full px-4 py-2.5 text-xs font-black ${updatedToday ? "bg-emerald-400 text-emerald-950" : "bg-[#ffd84d] text-stone-950"}`}>
                {updatedToday ? "\uC624\uB298 \uC5C5\uB370\uC774\uD2B8 \uC644\uB8CC" : "\uC624\uB298 \uC5C5\uB370\uC774\uD2B8\uD558\uAE30"}
              </a>
              <button type="button" onClick={() => setShowChooser((current) => !current)} className="rounded-full bg-white/10 px-4 py-2.5 text-xs font-black text-white/70 hover:bg-white/15">
                {"\uBBF8\uC158 \uBC14\uAFB8\uAE30"}
              </button>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/55">
              <span>{updatedDays}{"\uC77C \uC5C5\uB370\uC774\uD2B8"} / {mission.durationDays}{"\uC77C"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#b59cff] to-[#ffd84d] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {showChooser && (
        <div className={`p-5 sm:p-6 ${mission ? "border-t border-white/10 bg-black/10" : ""}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cbbcff]">{"\uC0C8 \uBBF8\uC158"}</p>
            <h2 className="mt-1 text-2xl font-black">{"\uC5B4\uB5A4 \uB3C4\uC804\uC744 \uC2DC\uC791\uD560\uAE4C\uC694?"}</h2>
            <p className="mt-2 text-sm font-semibold text-white/45">{"\uB9E4\uC77C \uC791\uC740 \uC5C5\uB370\uC774\uD2B8\uB85C \uBBF8\uC158\uC744 \uC774\uC5B4 \uAC00\uC138\uC694."}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {missionPresets.map((preset) => (
              <button key={preset.title} type="button" disabled={isSaving} onClick={() => chooseMission(preset.title, preset.durationDays)} className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-50">
                <span className="text-2xl">{preset.emoji}</span>
                <span className="mt-3 block text-sm font-black leading-5">{preset.title}</span>
                <span className="mt-1 block text-xs font-semibold text-white/40">{preset.durationDays}{"\uC77C \uB3C4\uC804"} · +{missionPointsForDuration(preset.durationDays)}P / day</span>
              </button>
            ))}
          </div>
          <form onSubmit={submitCustomMission} className="mt-4 grid gap-3 rounded-2xl bg-white/[0.06] p-4 sm:grid-cols-[1fr_8rem_auto]">
            <input name="missionTitle" required maxLength={120} placeholder={"\uC9C1\uC811 \uC785\uB825: \uB098\uB9CC\uC758 \uBBF8\uC158"} className="min-w-0 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none ring-[#b59cff] placeholder:text-white/30 focus:ring-2" />
            <input name="missionDuration" required type="number" min={1} max={365} defaultValue={7} aria-label="Mission duration in days" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none ring-[#b59cff] focus:ring-2" />
            <button type="submit" disabled={isSaving} className="rounded-xl bg-[#b59cff] px-5 py-3 text-sm font-black text-stone-950 disabled:opacity-50">
              {isSaving ? "\uC800\uC7A5 \uC911..." : "\uC2DC\uC791\uD558\uAE30"}
            </button>
          </form>
          <p className="mt-2 text-[11px] font-semibold text-white/35">{"\uAE30\uAC04\uC774 \uAE38\uC218\uB85D \uD558\uB8E8 \uC5C5\uB370\uC774\uD2B8 \uC810\uC218\uAC00 \uCEE4\uC838\uC694. \uD558\uB8E8 \uCCAB \uC5C5\uB370\uC774\uD2B8\uB9CC \uC810\uC218\uB97C \uBC1B\uC544\uC694."}</p>
          {error && <p className="mt-3 text-xs font-bold text-red-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
