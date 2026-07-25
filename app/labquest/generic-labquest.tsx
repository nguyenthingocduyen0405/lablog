"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import {
  completeChapterThree,
  completeChapterTwo,
  completeOnboarding,
  getCurrentUser,
  logoutAccount,
} from "../lib/auth";
import { useLab } from "../lib/lab-tenancy";
import { useI18n } from "../lib/i18n";
import { labTourHref } from "../lib/lab-routing";
import {
  evaluateQuestAnswer,
  isQuestCompletionMilestoneSaved,
  questCompletionStorageKey,
  resolveQuestCompletionDestination,
  resolveQuestCompletionMilestone,
  resolveRestoredQuestProgress,
  resolveVisibleChapterIndex,
  type QuestAnswer,
  type QuestCompletionMilestone,
} from "../lib/quest-gameplay";
import { safeQuestPaperUrl, type QuestMissionType } from "../lib/quest-admin";

type ChapterRow = {
  id: string;
  order_index: number;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
};

type MissionRow = {
  id: string;
  chapter_id: string;
  paper_id: string | null;
  order_index: number;
  mission_type: QuestMissionType;
  title_i18n: Record<string, string>;
  instructions_i18n: Record<string, string>;
  content: Record<string, unknown>;
  validation: Record<string, unknown>;
};

type QuestTheme = {
  eyebrow: string;
  border: string;
  soft: string;
  badge: string;
  button: string;
  glow: string;
};

const CHAPTER_THEMES: QuestTheme[] = [
  {
    eyebrow: "text-cyan-300",
    border: "border-cyan-200/20",
    soft: "bg-cyan-300/[.07]",
    badge: "bg-cyan-300/10 text-cyan-200",
    button: "bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] text-[#031119] shadow-[0_5px_0_#155f70]",
    glow: "shadow-[0_24px_80px_rgba(77,225,255,.08)]",
  },
  {
    eyebrow: "text-amber-300",
    border: "border-amber-200/20",
    soft: "bg-amber-300/[.07]",
    badge: "bg-amber-300/10 text-amber-200",
    button: "bg-gradient-to-r from-amber-300 to-orange-300 text-[#342612] shadow-[0_5px_0_#765220]",
    glow: "shadow-[0_24px_80px_rgba(242,198,109,.08)]",
  },
  {
    eyebrow: "text-emerald-300",
    border: "border-emerald-200/20",
    soft: "bg-emerald-300/[.07]",
    badge: "bg-emerald-300/10 text-emerald-200",
    button: "bg-gradient-to-r from-emerald-300 to-lime-300 text-[#071c19] shadow-[0_5px_0_#176554]",
    glow: "shadow-[0_24px_80px_rgba(110,231,183,.08)]",
  },
];

async function persistQuestCompletionMilestone(
  milestone: QuestCompletionMilestone,
  viewerId: string,
) {
  if (milestone === "onboarding") await completeOnboarding(viewerId);
  if (milestone === "chapter-two") await completeChapterTwo(viewerId);
  if (milestone === "chapter-three") await completeChapterThree(viewerId);
}

export default function GenericLabQuest() {
  const { activeLab } = useLab();
  const { locale, l } = useI18n();
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [viewerId, setViewerId] = useState("anonymous");
  const [requestedChapter, setRequestedChapter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingMissionId, setSavingMissionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const requested = Number(
        new URLSearchParams(window.location.search).get("chapter") ?? "1",
      );
      const nextRequestedChapter =
        Number.isInteger(requested) && requested > 0 ? requested : 1;
      setRequestedChapter(nextRequestedChapter);
      const supabase = createClient();
      Promise.all([
        supabase.from("quest_chapters").select("id,order_index,title_i18n,description_i18n").eq("lab_id", activeLab.id).eq("active", true).order("order_index"),
        supabase.from("quest_missions").select("id,chapter_id,paper_id,order_index,mission_type,title_i18n,instructions_i18n,content,validation").eq("active", true).order("order_index"),
        getCurrentUser(),
      ]).then(async ([chapterResult, missionResult, userResult]) => {
        if (cancelled) return;
        if (userResult && !userResult.labTourCompletedAt) {
          router.replace(labTourHref(activeLab.slug));
          return;
        }
        if (chapterResult.error) setError(chapterResult.error.message);
        else if (missionResult.error) setError(missionResult.error.message);
        else {
          const nextChapters = (chapterResult.data ?? []) as ChapterRow[];
          const chapterIds = new Set(nextChapters.map((chapter) => chapter.id));
          setChapters(nextChapters);
          const nextMissions = ((missionResult.data ?? []) as MissionRow[]).filter((mission) => chapterIds.has(mission.chapter_id));
          setMissions(nextMissions);
          const nextViewerId = userResult?.id ?? "anonymous";
          setViewerId(nextViewerId);
          try {
            let databaseIds: string[] = [];
            let databaseProgressReady = nextViewerId === "anonymous";
            if (
              nextViewerId !== "anonymous" &&
              nextMissions.length > 0
            ) {
              const progressResult = await supabase
                .from("quest_mission_progress")
                .select("mission_id")
                .eq("user_id", nextViewerId)
                .in(
                  "mission_id",
                  nextMissions.map((mission) => mission.id),
                );
              if (progressResult.error) {
                setError(progressResult.error.message);
              } else {
                databaseProgressReady = true;
                databaseIds = (progressResult.data ?? []).map((item) =>
                  String(item.mission_id),
                );
              }
            }
            if (cancelled) return;
            const stored = window.localStorage.getItem(
              questCompletionStorageKey(activeLab.id, nextViewerId),
            );
            const storedIds = stored ? (JSON.parse(stored) as string[]) : [];
            const missionIds = new Set(nextMissions.map((mission) => mission.id));
            const validIds = resolveRestoredQuestProgress({
              authenticated: nextViewerId !== "anonymous",
              databaseProgressReady,
              databaseIds,
              storedIds,
              missionIds,
            });
            if (cancelled) return;
            setCompleted(validIds);
            if (
              (nextViewerId === "anonymous" || databaseProgressReady) &&
              (validIds.length !== storedIds.length ||
                validIds.some((id) => !storedIds.includes(id)))
            ) {
              window.localStorage.setItem(
                questCompletionStorageKey(activeLab.id, nextViewerId),
                JSON.stringify(validIds),
              );
            }
            const restoredChapterMissionIds = nextChapters.map((chapter) =>
              nextMissions
                .filter((mission) => mission.chapter_id === chapter.id)
                .map((mission) => mission.id),
            );
            const restoredVisibleIndex = resolveVisibleChapterIndex(
              restoredChapterMissionIds,
              new Set(validIds),
              nextRequestedChapter,
            );
            const restoredCompletionDestination =
              nextViewerId === "anonymous" || restoredVisibleIndex < 0
                ? null
                : resolveQuestCompletionDestination(
                    `/members/${nextViewerId}`,
                    restoredChapterMissionIds[restoredVisibleIndex],
                    new Set(validIds),
                  );
            if (restoredCompletionDestination) {
              const milestone =
                resolveQuestCompletionMilestone(restoredVisibleIndex);
              if (
                userResult &&
                !isQuestCompletionMilestoneSaved(milestone, userResult)
              ) {
                try {
                  await persistQuestCompletionMilestone(
                    milestone,
                    nextViewerId,
                  );
                } catch {
                  setError(
                    "Could not save the feature unlock state. Please try again.",
                  );
                  setLoading(false);
                  return;
                }
              }
              if (cancelled) return;
              router.replace(restoredCompletionDestination);
              return;
            }
          } catch {
            setCompleted([]);
          }
        }
        setLoading(false);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeLab.id, activeLab.slug, router]);

  const translated = (value: Record<string, string>) =>
    value[locale] || value.ko || value.vi || value.en || Object.values(value)[0] || "";

  const completeMission = async (missionId: string) => {
    if (completed.includes(missionId) || savingMissionId) return false;
    setSavingMissionId(missionId);
    const next = [...completed, missionId];
    if (viewerId === "anonymous") {
      setCompleted(next);
      window.localStorage.setItem(
        questCompletionStorageKey(activeLab.id, viewerId),
        JSON.stringify(next),
      );
      setSavingMissionId(null);
      return true;
    }
    const supabase = createClient();
    const progressResult = await supabase
      .from("quest_mission_progress")
      .upsert(
        {
          mission_id: missionId,
          user_id: viewerId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "mission_id,user_id", ignoreDuplicates: true },
      );
    if (progressResult.error) {
      setError(progressResult.error.message);
      setSavingMissionId(null);
      return false;
    }
    setCompleted(next);
    window.localStorage.setItem(
      questCompletionStorageKey(activeLab.id, viewerId),
      JSON.stringify(next),
    );
    const mission = missions.find((item) => item.id === missionId);
    const chapterIndex = chapters.findIndex(
      (chapter) => chapter.id === mission?.chapter_id,
    );
    const chapterMissions = missions.filter(
      (item) => item.chapter_id === mission?.chapter_id,
    );
    const chapterComplete =
      chapterMissions.length > 0 &&
      chapterMissions.every((item) => next.includes(item.id));
    if (!chapterComplete) {
      setSavingMissionId(null);
      return true;
    }
    try {
      await persistQuestCompletionMilestone(
        resolveQuestCompletionMilestone(chapterIndex),
        viewerId,
      );
    } catch {
      setError(
        l(
          "기능 잠금 해제 상태를 저장하지 못했습니다.",
          "Không thể lưu trạng thái mở khóa tính năng.",
          "Could not save the feature unlock state.",
        ),
      );
      setSavingMissionId(null);
      return true;
    }
      const completionDestination = resolveQuestCompletionDestination(
        `/members/${viewerId}`,
        chapterMissions.map((item) => item.id),
        new Set(next),
    );
    if (completionDestination) {
      router.replace(completionDestination);
    }
    setSavingMissionId(null);
    return true;
  };

  const chapterMissionIds = useMemo(
    () =>
      chapters.map((chapter) =>
        missions
          .filter((mission) => mission.chapter_id === chapter.id)
          .map((mission) => mission.id),
      ),
    [chapters, missions],
  );
  const visibleChapterIndex = resolveVisibleChapterIndex(
    chapterMissionIds,
    new Set(completed),
    requestedChapter,
  );
  const visibleChapters =
    visibleChapterIndex >= 0 ? [chapters[visibleChapterIndex]] : [];
  const requestedChapterLocked =
    requestedChapter > visibleChapterIndex + 1;

  const totalPoints = useMemo(
    () => missions.filter((mission) => completed.includes(mission.id)).reduce((sum, mission) => sum + Number(mission.content.rewardPoints ?? 0), 0),
    [completed, missions],
  );

  const completionPercent = missions.length
    ? Math.round((completed.length / missions.length) * 100)
    : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(77,225,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(77,225,255,.13) 1px,transparent 1px)", backgroundSize: "38px 38px" }} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-72 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2.2rem] border border-cyan-200/15 bg-[#0b1b2b]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.24em] text-cyan-300">{activeLab.name} · QUEST SYSTEM</p>
              <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">LAB<span className="text-[#39ffb6]">QUEST</span></h1>
              <p className="mt-3 max-w-xl font-semibold leading-7 text-white/50">{l("미션을 완료하고 랩의 다음 단계를 열어 보세요.", "Hoàn thành nhiệm vụ và mở khóa bước tiếp theo của Lab.", "Complete missions and unlock the lab's next stage.")}</p>
            </div>
            <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="self-start rounded-full border border-white/10 bg-white/[.06] px-5 py-3 text-sm font-black text-white/70 transition hover:border-cyan-200/30 hover:text-white lg:self-auto">{l("로그아웃", "Đăng xuất", "Log out")}</button>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between text-xs font-black tracking-wider text-white/45"><span>QUEST PROGRESS</span><span>{completionPercent}%</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] transition-[width]" style={{ width: `${completionPercent}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.05] px-5 py-4"><span className="block text-[10px] font-black tracking-wider text-white/35">MISSIONS</span><strong className="mt-1 block text-2xl text-cyan-200">{completed.length}<span className="text-sm text-white/30"> / {missions.length}</span></strong></div>
            <div className="rounded-2xl border border-amber-200/15 bg-amber-300/[.06] px-5 py-4"><span className="block text-[10px] font-black tracking-wider text-amber-100/40">REWARD</span><strong className="mt-1 block text-2xl text-amber-200">{totalPoints} <span className="text-sm">PT</span></strong></div>
          </div>
        </header>

        {loading && <p className="mt-12 text-center font-black tracking-[.2em] text-cyan-200/40">LABQUEST · LOADING</p>}
        {!loading && chapters.length === 0 && (
          <section className="mt-10 rounded-[2rem] border border-cyan-200/15 bg-[#0b1b2b] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,.25)]">
            <div className="text-5xl">🎮</div>
            <h2 className="mt-4 text-2xl font-black">{l("아직 퀘스트가 없습니다", "Lab này chưa có Quest", "No quests yet")}</h2>
            <p className="mx-auto mt-3 max-w-xl font-medium text-white/45">{l("랩 관리자가 게임을 설계할 수 있습니다.", "Quản lý Lab có thể thiết kế game cho Lab này.", "A lab admin can design games for this lab.")}</p>
            {(activeLab.membershipRole === "owner" || activeLab.membershipRole === "admin") && <Link href={"/labs/" + activeLab.slug + "/quests"} className="mt-6 inline-block rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-6 py-3 font-black text-[#031119] shadow-[0_5px_0_#155f70]">{l("게임 설계", "Thiết kế game", "Design games")}</Link>}
          </section>
        )}

        <div className="mt-10 space-y-8">
          {requestedChapterLocked && (
            <p role="status" className="rounded-2xl border border-amber-200/20 bg-amber-300/[.08] px-5 py-4 text-sm font-bold text-amber-100">
              {l(
                "이전 Chapter를 완료하면 요청한 Chapter가 열립니다.",
                "Hoàn thành Chapter trước để mở Chapter bạn yêu cầu.",
                "Complete the previous Chapter to unlock the requested Chapter.",
              )}
            </p>
          )}
          {visibleChapters.map((chapter) => {
            const chapterIndex = chapters.findIndex(
              (item) => item.id === chapter.id,
            );
            const theme = CHAPTER_THEMES[chapterIndex % CHAPTER_THEMES.length];
            const chapterMissions = missions.filter((mission) => mission.chapter_id === chapter.id);
            const chapterCompleted = chapterMissions.filter((mission) => completed.includes(mission.id)).length;
            return (
              <section key={chapter.id} className={`rounded-[2rem] border bg-[#0b1b2b]/95 p-5 sm:p-7 ${theme.border} ${theme.glow}`}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[.22em] ${theme.eyebrow}`}>CHAPTER {String(chapter.order_index).padStart(2, "0")}</p>
                    <h2 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">{translated(chapter.title_i18n)}</h2>
                    <p className="mt-3 max-w-2xl font-medium leading-7 text-white/45">{translated(chapter.description_i18n)}</p>
                  </div>
                  <div className={`shrink-0 rounded-2xl border px-4 py-3 ${theme.border} ${theme.soft}`}><span className="block text-[10px] font-black tracking-wider text-white/35">CHAPTER CLEAR</span><strong className={`mt-1 block text-xl ${theme.eyebrow}`}>{chapterCompleted} / {chapterMissions.length}</strong></div>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {chapterMissions.map((mission) => (
                    <MissionGame key={mission.id} mission={mission} translated={translated} completed={completed.includes(mission.id)} saving={savingMissionId === mission.id} onComplete={() => completeMission(mission.id)} paperClubHref={"/labs/" + activeLab.slug + "/papers"} l={l} theme={theme} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 font-bold text-red-200">{error}</p>}
      </div>
    </main>
  );
}

function MissionGame({ mission, translated, completed, saving, onComplete, paperClubHref, l, theme }: {
  mission: MissionRow;
  translated: (value: Record<string, string>) => string;
  completed: boolean;
  saving: boolean;
  onComplete: () => Promise<boolean>;
  paperClubHref: string;
  l: (ko: string, vi: string, en: string) => string;
  theme: QuestTheme;
}) {
  const matchingPairs = Array.isArray(mission.content.pairs)
    ? mission.content.pairs
        .map((pair) => {
          const value = pair && typeof pair === "object" ? pair as Record<string, unknown> : {};
          return { left: String(value.left ?? ""), right: String(value.right ?? "") };
        })
        .filter((pair) => pair.left && pair.right)
    : [];
  const isMatching =
    mission.mission_type === "ordering" &&
    mission.validation.matching === true &&
    matchingPairs.length > 1;
  const initialItems = Array.isArray(mission.content.items) ? mission.content.items.map(String).reverse() : [];
  const [answer, setAnswer] = useState<QuestAnswer>(isMatching ? {} : mission.mission_type === "ordering" ? initialItems : mission.mission_type === "quiz" ? null : "");
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"" | "correct" | "wrong">(completed ? "correct" : "");
  const options = Array.isArray(mission.content.options) ? mission.content.options.map(String) : [];
  const points = Number(mission.content.rewardPoints ?? 0);
  const paperUrl = safeQuestPaperUrl(mission.content.paperUrl);

  const submit = async () => {
    const correct = evaluateQuestAnswer(mission.mission_type, answer, mission.validation);
    if (!correct) {
      setFeedback("wrong");
      return;
    }
    setFeedback("");
    const saved = await onComplete();
    setFeedback(saved ? "correct" : "");
  };

  const confirmCustom = async () => {
    setAnswer(true);
    setFeedback("");
    const saved = await onComplete();
    setFeedback(saved ? "correct" : "");
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!Array.isArray(answer)) return;
    const target = index + direction;
    if (target < 0 || target >= answer.length) return;
    const next = [...answer];
    [next[index], next[target]] = [next[target], next[index]];
    setAnswer(next);
    setFeedback("");
  };

  const matchingAnswer =
    answer && typeof answer === "object" && !Array.isArray(answer)
      ? answer as Record<string, number>
      : {};
  const rightChoices = matchingPairs
    .map((pair, originalIndex) => ({ label: pair.right, originalIndex }))
    .reverse();

  const connectPair = (rightIndex: number) => {
    if (selectedLeft === null || completed) return;
    setAnswer((current) => {
      const previous =
        current && typeof current === "object" && !Array.isArray(current)
        ? current as Record<string, number>
        : {};
      const next = Object.fromEntries(
        Object.entries(previous).filter(
          ([left, right]) =>
            left !== String(selectedLeft) && right !== rightIndex,
        ),
      );
      return { ...next, [String(selectedLeft)]: rightIndex };
    });
    setSelectedLeft(null);
    setFeedback("");
  };

  return (
    <article className={"group relative overflow-hidden rounded-[1.6rem] border p-5 transition sm:p-6 " + (completed ? "border-emerald-300/30 bg-emerald-300/[.08]" : `${theme.border} bg-[#07131f]/75 hover:-translate-y-1 hover:bg-white/[.045]`)}>
      <div aria-hidden="true" className={`absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl ${completed ? "bg-emerald-300/15" : theme.soft}`} />
      <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-black uppercase tracking-[.16em] ${completed ? "text-emerald-300" : theme.eyebrow}`}>MISSION {String(mission.order_index).padStart(2, "0")} · {mission.mission_type}</p>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${completed ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : `${theme.border} ${theme.badge}`}`}>{completed ? "✓ " : "+"}{points} PT</span>
      </div>
      <h3 className="mt-4 text-xl font-black tracking-[-.02em] text-white">{translated(mission.title_i18n)}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-white/45">{translated(mission.instructions_i18n)}</p>

      {mission.mission_type === "quiz" && <div className="mt-5 space-y-2">{options.map((option, index) => <label key={index} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition ${answer === index ? `${theme.border} ${theme.soft} text-white` : "border-white/[.07] bg-white/[.035] text-white/65 hover:bg-white/[.07]"}`}><input type="radio" name={"quiz-" + mission.id} checked={answer === index} onChange={() => { setAnswer(index); setFeedback(""); }} className="accent-cyan-300" />{option}</label>)}</div>}
      {isMatching && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-bold text-white/35">{l("왼쪽 항목을 고른 뒤 맞는 오른쪽 항목을 선택하세요.", "Chọn mục bên trái, sau đó chọn nội dung phù hợp bên phải.", "Choose a left item, then select its match on the right.")}</p>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3">
            <div className="space-y-2">
              {matchingPairs.map((pair, index) => {
                const connected = matchingAnswer[String(index)] !== undefined;
                return <button key={index} type="button" disabled={completed} onClick={() => setSelectedLeft(index)} className={`min-h-14 w-full rounded-xl border px-3 py-3 text-left text-sm font-black transition ${selectedLeft === index ? `${theme.border} ${theme.soft} text-white ring-2 ring-cyan-300/30` : connected ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-white/[.07] bg-white/[.035] text-white/65 hover:bg-white/[.07]"}`}><span className="mr-2 text-xs opacity-40">{String(index + 1).padStart(2, "0")}</span>{pair.left}</button>;
              })}
            </div>
            <div className="flex flex-col items-center justify-around text-white/20"><span>●</span><span>●</span><span>●</span></div>
            <div className="space-y-2">
              {rightChoices.map((choice) => {
                const connectedLeft = Object.keys(matchingAnswer).find((left) => matchingAnswer[left] === choice.originalIndex);
                return <button key={choice.originalIndex} type="button" disabled={completed || selectedLeft === null} onClick={() => connectPair(choice.originalIndex)} className={`min-h-14 w-full rounded-xl border px-3 py-3 text-left text-sm font-black transition ${connectedLeft !== undefined ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : selectedLeft !== null ? `${theme.border} ${theme.soft} text-white hover:brightness-125` : "border-white/[.07] bg-white/[.025] text-white/45"}`}>{choice.label}{connectedLeft !== undefined && <span className="ml-2 text-xs text-emerald-300">← {Number(connectedLeft) + 1}</span>}</button>;
              })}
            </div>
          </div>
        </div>
      )}
      {!isMatching && mission.mission_type === "ordering" && Array.isArray(answer) && <div className="mt-5 space-y-2">{answer.map((item, index) => <div key={item + index} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.035] p-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${theme.badge}`}>{index + 1}</span><span className="min-w-0 flex-1 text-sm font-bold text-white/75">{item}</span><button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label={l("위로", "Đưa lên", "Move up")} className="h-8 w-8 rounded-lg bg-white/[.07] text-white/70 disabled:opacity-20">↑</button><button type="button" onClick={() => moveItem(index, 1)} disabled={index === answer.length - 1} aria-label={l("아래로", "Đưa xuống", "Move down")} className="h-8 w-8 rounded-lg bg-white/[.07] text-white/70 disabled:opacity-20">↓</button></div>)}</div>}
      {mission.mission_type === "paper" && Boolean(mission.paper_id || paperUrl) && (
        <div className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/[.08] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-violet-300">PAPER CLUB</p>
          <p className="mt-1 font-black text-violet-100">{String(mission.content.paperTitle || l("연결된 페이퍼", "Paper liên kết", "Linked paper"))}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {paperUrl && <a href={paperUrl} target="_blank" rel="noreferrer" className="rounded-full bg-violet-300 px-4 py-2 text-xs font-black text-violet-950">{l("페이퍼 열기", "Mở paper", "Open paper")}</a>}
            {mission.paper_id && <Link href={paperClubHref + "?paper=" + encodeURIComponent(mission.paper_id)} className="rounded-full border border-violet-200/20 bg-white/[.07] px-4 py-2 text-xs font-black text-violet-100">{l("토론 보기", "Xem thảo luận", "View discussion")}</Link>}
          </div>
        </div>
      )}
      {mission.mission_type === "code-output" && <pre className="mt-5 overflow-x-auto rounded-xl border border-emerald-300/15 bg-black/30 p-4 text-xs text-emerald-300">{String(mission.content.codeSnippet ?? "")}</pre>}
      {mission.mission_type === "code-editor" && <textarea value={String(answer)} onChange={(event) => { setAnswer(event.target.value); setFeedback(""); }} rows={6} spellCheck={false} className="mt-5 w-full rounded-xl border border-emerald-300/15 bg-black/30 p-4 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-300/50" placeholder={String(mission.content.starterCode ?? "")} />}
      {(mission.mission_type === "code-output" || mission.mission_type === "paper" || mission.mission_type === "graph") && <textarea value={String(answer ?? "")} onChange={(event) => { setAnswer(event.target.value); setFeedback(""); }} rows={mission.mission_type === "code-output" ? 2 : 4} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-cyan-300/50" placeholder={String(mission.content.responsePlaceholder ?? mission.content.graphPrompt ?? l("답변", "Câu trả lời", "Answer"))} />}

      {mission.mission_type === "custom" ? <button type="button" disabled={completed || saving} onClick={() => void confirmCustom()} className={`mt-5 w-full rounded-xl px-4 py-3 font-black transition active:translate-y-1 disabled:translate-y-0 disabled:bg-emerald-400 disabled:text-emerald-950 disabled:shadow-none ${theme.button}`}>{completed ? l("완료됨", "Đã hoàn thành", "Completed") : saving ? l("저장 중", "Đang lưu", "Saving") : String(mission.content.confirmationLabel || l("완료했습니다", "Tôi đã hoàn thành", "I completed this"))}</button> : <button type="button" disabled={completed || saving} onClick={() => void submit()} className={`mt-5 w-full rounded-xl px-4 py-3 font-black transition active:translate-y-1 disabled:translate-y-0 disabled:bg-emerald-400 disabled:text-emerald-950 disabled:shadow-none ${theme.button}`}>{completed ? l("완료됨", "Đã hoàn thành", "Completed") : saving ? l("저장 중", "Đang lưu", "Saving") : l("정답 확인", "Kiểm tra", "Check answer")}</button>}
      {feedback === "wrong" && <p role="alert" className="mt-4 rounded-xl border border-red-300/15 bg-red-500/10 px-3 py-3 text-sm font-black text-red-200">{l("다시 시도해 보세요.", "Chưa đúng, hãy thử lại.", "Not quite. Try again.")}</p>}
      {feedback === "correct" && <p role="status" className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-3 text-sm font-black text-emerald-200">✓ {l("미션 완료!", "Hoàn thành Mission!", "Mission complete!")}</p>}
      </div>
    </article>
  );
}
