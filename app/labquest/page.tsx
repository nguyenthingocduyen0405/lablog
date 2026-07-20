"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";

type GamePhase = "loading" | "briefing" | "playing" | "result" | "saving";
type Target = { x: number; y: number; rare: boolean };

const CHAPTER = { seconds: 30, goal: 12, name: "BOOTLOADER", korean: "부트로더" } as const;

function createTarget(): Target {
  return { x: 10 + Math.random() * 80, y: 20 + Math.random() * 66, rare: Math.random() < 0.18 };
}

export default function LabQuestChapterOnePage() {
  const router = useRouter();
  const targetRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(CHAPTER.seconds);
  const [target, setTarget] = useState<Target>(() => createTarget());
  const [lastGain, setLastGain] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      if (!cancelled) { setUser(currentUser); setPhase("briefing"); }
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) { window.clearInterval(timer); setPhase("result"); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function startChapter() {
    setScore(0); setCombo(0); setHits(0); setMisses(0); setLastGain(null); setMessage("");
    setTimeLeft(CHAPTER.seconds); setTarget(createTarget()); setPhase("playing");
    window.setTimeout(() => targetRef.current?.focus(), 80);
  }

  function catchTarget(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (phase !== "playing") return;
    const multiplier = 1 + Math.floor(combo / 5);
    const gain = (target.rare ? 3 : 1) * multiplier;
    setScore((current) => current + gain); setHits((current) => current + 1); setCombo((current) => current + 1);
    setLastGain(gain); setTarget(createTarget());
    window.setTimeout(() => setLastGain(null), 360);
    window.setTimeout(() => targetRef.current?.focus(), 0);
  }

  function missTarget() {
    if (phase !== "playing") return;
    setMisses((current) => current + 1); setCombo(0);
  }

  async function enterLabLog() {
    if (!user || score < CHAPTER.goal || phase === "saving") return;
    setPhase("saving"); setMessage("");
    try {
      if (!user.onboardingCompletedAt) await completeOnboarding(user.id);
      router.replace("/mission");
    } catch {
      setPhase("result");
      setMessage("진행 상황을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  if (phase === "loading" || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#030a12] text-[#4de1ff]"><p className="text-xs font-black tracking-[.24em]">LABQUEST LOADING...</p></main>;
  }

  const passed = score >= CHAPTER.goal;
  const accuracy = hits + misses === 0 ? 100 : Math.round((hits / (hits + misses)) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030a12] p-3 text-white sm:p-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-500/15 blur-[120px]" />
      <section onClick={missTarget} aria-label="LabQuest Chapter 1 game area" className="relative mx-auto min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-[#06111f] shadow-[0_28px_100px_rgba(0,0,0,.55)] sm:min-h-[calc(100vh-3rem)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(77,225,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(77,225,255,.18) 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
        <header className="relative z-20 flex items-center justify-between border-b border-cyan-200/10 px-5 py-4 sm:px-8">
          <div><p className="text-xs font-black tracking-[.22em] text-[#39ffb6]">LABQUEST</p><p className="mt-1 text-[9px] font-bold tracking-[.16em] text-cyan-100/35">OS LAB / ARCHITECTURE BUILD</p></div>
          <div className="text-right"><p className="text-xs font-black">{user.name}</p><p className="mt-1 text-[9px] font-bold text-cyan-100/35">CHAPTER 01</p></div>
        </header>

        {phase === "playing" && <>
          <div className="relative z-20 mx-auto mt-4 grid w-fit grid-cols-3 overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#071522]/90 text-center backdrop-blur">
            <div className="min-w-24 border-r border-cyan-100/10 px-4 py-2"><span className="block text-[8px] font-black tracking-[.15em] text-cyan-100/40">점수</span><strong className="text-xl">{score}</strong></div>
            <div className="min-w-24 border-r border-cyan-100/10 px-4 py-2"><span className="block text-[8px] font-black tracking-[.15em] text-cyan-100/40">콤보</span><strong className="text-xl text-[#39ffb6]">×{combo}</strong></div>
            <div className="min-w-24 px-4 py-2"><span className="block text-[8px] font-black tracking-[.15em] text-cyan-100/40">시간</span><strong className="text-xl">{timeLeft}s</strong></div>
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10"><span className="block h-full bg-gradient-to-r from-cyan-400 to-[#39ffb6] transition-[width]" style={{ width: `${(timeLeft / CHAPTER.seconds) * 100}%` }} /></span>
          </div>
          <button ref={targetRef} type="button" onClick={catchTarget} aria-label={target.rare ? "희귀 코어, 3점" : "시스템 코어"} className={`absolute z-30 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border text-2xl font-black shadow-2xl transition-[left,top] duration-200 sm:h-20 sm:w-20 ${target.rare ? "border-[#39ffb6] bg-[#39ffb6] text-[#031119] shadow-emerald-400/40" : "border-cyan-100/60 bg-cyan-50 text-[#06111f] shadow-cyan-300/25"}`} style={{ left: `${target.x}%`, top: `${target.y}%` }}>{target.rare ? "★" : "✦"}</button>
          {lastGain !== null && <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 text-4xl font-black text-[#39ffb6]">+{lastGain}</div>}
          <p className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-center text-[10px] font-black tracking-[.14em] text-cyan-100/35">TARGET {CHAPTER.goal} XP · 희귀 코어는 3배 점수</p>
        </>}

        {phase === "briefing" && <div className="relative z-20 flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-24 w-24 items-center justify-center border border-cyan-300/40 bg-cyan-300/10 text-4xl font-black text-[#4de1ff] shadow-[0_0_45px_rgba(77,225,255,.15)]">&gt;_</div>
          <p className="mt-8 text-[10px] font-black tracking-[.25em] text-[#39ffb6]">CHAPTER 01 · STARTUP</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">{CHAPTER.name}</h1><p className="mt-2 text-lg font-black text-cyan-100/55">{CHAPTER.korean}</p>
          <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-cyan-50/45">랩 지도를 확인했어요. 이제 시스템 코어를 활성화해서 OS Lab의 첫 번째 모듈을 깨워 보세요.</p>
          <div className="mt-8 flex gap-3 text-xs font-black"><span className="rounded-full bg-white/5 px-4 py-2 text-cyan-100/55">30초</span><span className="rounded-full bg-white/5 px-4 py-2 text-cyan-100/55">목표 {CHAPTER.goal} XP</span></div>
          <button type="button" onClick={startChapter} className="mt-9 rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-8 py-4 text-sm font-black text-[#031119] shadow-[0_7px_0_#176a76] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none">CHAPTER 1 시작 →</button>
        </div>}

        {(phase === "result" || phase === "saving") && <div className="relative z-40 flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center bg-[#030a12]/85 px-6 py-12 text-center backdrop-blur-sm">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black ${passed ? "bg-[#39ffb6] text-[#031119]" : "bg-red-400 text-white"}`}>{passed ? "✓" : "!"}</div>
          <p className="mt-7 text-[10px] font-black tracking-[.22em] text-cyan-300">CHAPTER 01 / {CHAPTER.name}</p><h2 className="mt-2 text-4xl font-black">{passed ? "CHAPTER CLEAR" : "SYSTEM NOT READY"}</h2>
          <div className="mt-8 grid grid-cols-3 divide-x divide-white/10"><div className="px-5"><strong className="block text-2xl">{score}</strong><span className="text-[8px] font-black tracking-[.12em] text-white/35">XP</span></div><div className="px-5"><strong className="block text-2xl">{accuracy}%</strong><span className="text-[8px] font-black tracking-[.12em] text-white/35">정확도</span></div><div className="px-5"><strong className="block text-2xl">{hits}</strong><span className="text-[8px] font-black tracking-[.12em] text-white/35">코어</span></div></div>
          {message && <p role="status" className="mt-5 text-sm font-bold text-red-300">{message}</p>}
          {passed ? <button type="button" disabled={phase === "saving"} onClick={enterLabLog} className="mt-9 rounded-full bg-[#39ffb6] px-8 py-4 text-sm font-black text-[#031119] shadow-[0_7px_0_#137353] disabled:opacity-50">{phase === "saving" ? "저장 중..." : "LABLOG 시작하기 →"}</button> : <button type="button" onClick={startChapter} className="mt-9 rounded-full bg-white px-8 py-4 text-sm font-black text-[#06111f] shadow-[0_7px_0_#5b7380]">다시 도전 ↻</button>}
        </div>}
      </section>
    </main>
  );
}