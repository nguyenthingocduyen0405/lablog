"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeChapterTwo, completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";
import ChapterTwo from "./chapter-two";

type Screen = "loading" | "intro" | "map" | "m1" | "r1" | "m2" | "r2" | "m3" | "r3" | "m4" | "complete" | "c2" | "saving";
type Pair = { id: string; device: string; deviceKo: string; abstraction: string; abstractionEn: string; icon: string };

const PAIRS: Pair[] = [
  { id: "cpu", device: "CPU", deviceKo: "중앙처리장치", abstraction: "프로세스", abstractionEn: "Process", icon: "CPU" },
  { id: "ram", device: "RAM", deviceKo: "주기억장치", abstraction: "가상 메모리", abstractionEn: "Virtual Memory", icon: "RAM" },
  { id: "disk", device: "SSD / HDD", deviceKo: "저장장치", abstraction: "파일", abstractionEn: "File", icon: "SSD" },
  { id: "network", device: "네트워크 카드", deviceKo: "통신 장치", abstraction: "소켓", abstractionEn: "Socket", icon: "NET" },
  { id: "keyboard", device: "키보드", deviceKo: "입력 장치", abstraction: "입력 스트림", abstractionEn: "Input Stream", icon: "KEY" },
];
const RIGHT_ORDER = ["disk", "keyboard", "cpu", "network", "ram"];
const MISSIONS = [
  ["OS Abstraction", "하드웨어와 OS 추상화 연결", "Codex 이용권"],
  ["CPU Scheduling", "SJF로 프로세스 실행 순서 결정", "₩150,000 상품권"],
  ["Memory Paging", "Page Table로 Frame 찾기", "랩 출입문 카드"],
  ["Disk Scheduling", "SSTF로 디스크 요청 처리", "Chapter 01 Clear"],
] as const;

export default function LabQuestChapterOnePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [completed, setCompleted] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((currentUser) => {
      if (!currentUser) return router.replace("/login");
      if (cancelled) return;
      setUser(currentUser);
      const saved = window.localStorage.getItem(`labquest-chapter1-${currentUser.id}`);
      const progress = saved ? (JSON.parse(saved) as number[]) : [];
      setCompleted(progress.filter((value) => [1, 2, 3, 4].includes(value)));
      const chapterTwoRequested = new URLSearchParams(window.location.search).get("chapter") === "2";
      if (progress.includes(4)) {
        if (chapterTwoRequested) setScreen("c2");
        else router.replace("/mission");
        return;
      }
      setScreen(progress.length ? "map" : "intro");
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  function finishMission(number: number) {
    if (!user) return;
    const next = Array.from(new Set([...completed, number])).sort();
    setCompleted(next);
    window.localStorage.setItem(`labquest-chapter1-${user.id}`, JSON.stringify(next));
  }

  function claimReward(number: number) {
    finishMission(number);
    setScreen(number === 4 ? "complete" : "map");
  }

  async function enterLabLog() {
    if (!user || screen === "saving") return;
    setScreen("saving");
    setError("");
    try {
      if (!user.onboardingCompletedAt) await completeOnboarding(user.id);
      router.replace("/mission");
    } catch {
      setScreen("complete");
      setError("진행 상황을 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  if (screen === "loading" || !user) return <Loading />;
  if (screen === "c2") return <ChapterTwo userId={user.id} chapterCompleted={Boolean(user.chapterTwoCompletedAt)} onBackToLabLog={() => router.push(user.chapterTwoCompletedAt ? "/update" : "/mission")} onUnlocked={async () => { if (!user.onboardingCompletedAt) await completeOnboarding(user.id); await completeChapterTwo(user.id); setUser({ ...user, onboardingCompletedAt: user.onboardingCompletedAt ?? new Date().toISOString(), chapterTwoCompletedAt: new Date().toISOString() }); }} />;
  if (screen === "intro") return <Intro onBack={() => router.push("/lab-tour")} onStart={() => setScreen("m1")} />;
  if (screen === "map") return <ChapterMap completed={completed} onSelect={(number) => setScreen(`m${number}` as Screen)} />;
  if (screen === "m1") return <MissionOne onDone={() => setScreen("r1")} onMap={() => setScreen("map")} />;
  if (screen === "r1") return <RewardOne onContinue={() => claimReward(1)} />;
  if (screen === "m2") return <MissionTwo onDone={() => setScreen("r2")} onMap={() => setScreen("map")} />;
  if (screen === "r2") return <RewardTwo onContinue={() => claimReward(2)} />;
  if (screen === "m3") return <MissionThree onDone={() => setScreen("r3")} onMap={() => setScreen("map")} />;
  if (screen === "r3") return <RewardThree onContinue={() => claimReward(3)} />;
  if (screen === "m4") return <MissionFour onDone={() => { finishMission(4); setScreen("complete"); }} onMap={() => setScreen("map")} />;
  return <ChapterComplete saving={screen === "saving"} error={error} onEnter={enterLabLog} />;
}

function Loading() {
  return <main className="flex min-h-screen items-center justify-center bg-[#07131f] text-cyan-300"><p className="text-xs font-black tracking-[.24em]">LAB QUEST LOADING...</p></main>;
}

function Intro({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return <Shell>
    <button onClick={onBack} className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20">← 랩 지도로</button>
    <div className="mx-auto mt-8 grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_.8fr]">
      <section>
        <Tag>CHAPTER 01 · OPERATING SYSTEM</Tag>
        <h1 className="mt-4 text-5xl font-black tracking-[-.06em] sm:text-7xl">운영체제의<br /><span className="text-cyan-300">비밀 정원</span></h1>
        <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-white/60">CPU, Memory, Storage를 따라 OS의 핵심을 하나씩 탐험해 보세요. 네 개의 미션과 특별한 보상이 기다리고 있습니다.</p>
        <button onClick={onStart} className="mt-8 rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-8 py-4 text-sm font-black text-[#031119] shadow-[0_7px_0_#155f70]">CHAPTER 1 시작하기 →</button>
      </section>
      <section className="rounded-[2rem] border border-cyan-200/20 bg-[#0b1b2b]/90 p-7">
        <Image src="/os-penguin.png" alt="OS Lab 안내 펭귄" width={180} height={180} className="mx-auto h-44 w-44 object-contain" />
        <p className="mt-4 text-center text-xs font-black tracking-[.2em] text-cyan-300">OS LAB GUIDE</p>
        <p className="mt-3 text-center text-sm font-semibold leading-6 text-white/60">첫 번째 챕터에서는 OS가 하드웨어를 어떻게 관리하는지 직접 체험해요.</p>
      </section>
    </div>
  </Shell>;
}

function ChapterMap({ completed, onSelect }: { completed: number[]; onSelect: (number: number) => void }) {

  return <Shell>
    <div className="mx-auto max-w-5xl">
      <header className="flex items-start justify-between gap-5"><div><Tag>CHAPTER 01</Tag><h1 className="mt-2 text-4xl font-black sm:text-6xl">운영체제의 비밀 정원</h1><p className="mt-3 text-base leading-7 text-white/55">미션을 완료하면 다음 미션과 보상이 열립니다.</p></div><div className="rounded-2xl border border-cyan-200/15 bg-white/5 px-5 py-3 text-right"><small className="block text-[9px] font-black tracking-widest text-white/35">CHAPTER PROGRESS</small><strong className="text-2xl text-[#39ffb6]">{completed.length} / 4</strong></div></header>
      <div className="mt-10 space-y-4">
        {MISSIONS.map((mission, index) => {
          const number = index + 1; const done = completed.includes(number); const unlocked = number === 1 || completed.includes(number - 1);
          return <button key={mission[0]} disabled={!unlocked} onClick={() => onSelect(number)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[1.5rem] border p-5 text-left transition ${done ? "border-emerald-300/30 bg-emerald-300/[.08]" : unlocked ? "border-cyan-200/20 bg-white/[.045] hover:-translate-y-1 hover:border-cyan-300/50" : "border-white/5 bg-white/[.02] opacity-40"}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black ${done ? "bg-[#39ffb6] text-[#07131f]" : "bg-cyan-300/10 text-cyan-200"}`}>{done ? "✓" : String(number).padStart(2, "0")}</span>
            <span><small className="text-[9px] font-black tracking-[.18em] text-cyan-300">MISSION {String(number).padStart(2, "0")}</small><strong className="mt-1 block text-xl">{mission[0]}</strong><span className="mt-1 block text-sm leading-6 text-white/50">{mission[1]}</span></span>
            <span className="text-right text-sm font-bold text-white/50">{unlocked ? mission[2] : "LOCKED"}<b className="ml-3 text-lg text-cyan-300">{unlocked ? "→" : "🔒"}</b></span>
          </button>;
        })}
      </div>
    </div>
  </Shell>;
}

function MissionOne({ onDone, onMap }: MissionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("왼쪽에서 물리 장치를 먼저 선택하세요.");
  function choose(id: string) {
    if (!selected) return setFeedback("먼저 왼쪽 장치를 선택하세요.");
    setAttempts((v) => v + 1);
    if (selected !== id) return setFeedback("아직 아니에요. 올바른 OS abstraction을 찾아보세요.");
    const next = [...matched, id]; setMatched(next); setSelected(null); setFeedback("정답이에요! OS abstraction이 연결되었어요.");
    if (next.length === PAIRS.length) window.setTimeout(onDone, 650);
  }
  return <MissionShell number={1} title="OS Abstraction" subtitle="물리 장치와 운영체제의 추상화 개념을 연결하세요." onMap={onMap} status={`${matched.length}/5 · 시도 ${attempts}`}>
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6">
      <div className="space-y-3">{PAIRS.map((p) => <Choice key={p.id} done={matched.includes(p.id)} active={selected === p.id} onClick={() => { setSelected(p.id); setFeedback(`${p.device}와 맞는 abstraction을 선택하세요.`); }} title={p.device} subtitle={p.deviceKo} badge={p.icon} />)}</div>
      <div className="flex items-center text-cyan-300/40">⇄</div>
      <div className="space-y-3">{RIGHT_ORDER.map((id) => { const p = PAIRS.find((x) => x.id === id)!; return <Choice key={id} done={matched.includes(id)} onClick={() => choose(id)} title={p.abstraction} subtitle={p.abstractionEn} badge="OS" reverse />; })}</div>
    </div>
    <Feedback>{feedback}</Feedback>
  </MissionShell>;
}

const PROCESSES = [
  { id: "P1", name: "논문 PDF 분석", burst: 5, color: "#f08cc7" },
  { id: "P2", name: "센서 로그 저장", burst: 2, color: "#71dca8" },
  { id: "P3", name: "실험 영상 처리", burst: 7, color: "#8da5ff" },
  { id: "P4", name: "결과 그래프 생성", burst: 3, color: "#ffd06b" },
];
function MissionTwo({ onDone, onMap }: MissionProps) {
  const [order, setOrder] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState("가장 짧은 CPU Burst를 가진 프로세스를 선택하세요.");
  const remaining = PROCESSES.filter((process) => !order.includes(process.id));
  const complete = order.length === PROCESSES.length;

  function select(process: (typeof PROCESSES)[number]) {
    if (complete) return;
    const shortest = [...remaining].sort((a, b) => a.burst - b.burst)[0];
    if (process.id !== shortest.id) {
      setErrors((value) => value + 1);
      setFeedback(`${process.id}보다 CPU Burst가 짧은 프로세스가 Ready Queue에 있어요.`);
      return;
    }
    setOrder((value) => [...value, process.id]);
    setFeedback(`${process.id}가 CPU에 배치되었습니다. 다음 프로세스를 선택하세요.`);
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_78%_12%,#2a426d,transparent_28%),linear-gradient(#081326,#0c1b30_65%,#0b2024)] text-white">
    <header className="grid h-20 grid-cols-[7rem_1fr_auto] items-center gap-4 border-b border-[#8da5ff]/15 bg-[#07101e]/90 px-4 sm:px-8 lg:px-12">
      <button onClick={onMap} className="rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10">← 지도</button>
      <div className="flex flex-col"><small className="text-[10px] font-black tracking-[.16em] text-[#7d90b4]">OS LAB · MISSION 02</small><strong className="mt-1 text-lg">CPU 스케줄링</strong></div>
      <span className="grid h-11 min-w-16 place-items-center rounded-full border border-[#73dfa8]/35 bg-[#73dfa8]/10 text-sm font-black text-[#73dfa8]">{order.length}/4</span>
    </header>

    <section className="mx-auto w-[min(1080px,calc(100%-2rem))] py-9 sm:py-12">
      <div className="grid items-end gap-7 md:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-black tracking-[.18em] text-[#8da5ff]">SHORTEST JOB FIRST</p><h1 className="mt-3 text-4xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl">CPU가 먼저 처리할<br /><em className="not-italic text-[#73dfa8]">프로세스</em>를 선택하세요</h1><p className="mt-5 text-base font-semibold leading-7 text-[#aab8d0]">CPU Burst가 짧은 작업부터 실행하면 평균 대기 시간을 줄일 수 있어요.</p></div>
        <div className="min-w-44 rounded-2xl border border-[#ffd06b]/25 bg-[#ffd06b]/[.05] p-5"><small className="text-[10px] font-black tracking-[.14em] text-[#b7a16f]">ERRORS</small><strong className="mt-1 block text-3xl text-[#ffd06b]">{errors}</strong><span className="mt-2 block text-xs font-bold text-[#8998b2]">SJF · NON-PREEMPTIVE</span></div>
      </div>

      <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-[1fr_5rem_16rem]">
        <section className="rounded-[1.25rem] border border-[#8da5ff]/20 bg-[#091728]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,.2)]">
          <ZoneTitle title="READY QUEUE" subtitle="WAITING PROCESSES" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{PROCESSES.map((process) => {
            const processed = order.includes(process.id);
            return <button key={process.id} disabled={processed} onClick={() => select(process)} style={{ borderColor: processed ? "#26384c" : `${process.color}73`, backgroundColor: processed ? "#07131f" : `${process.color}16` }} className={`grid min-h-24 grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border p-3 text-left transition ${processed ? "cursor-default opacity-40 grayscale" : "hover:-translate-y-1"}`}>
              <i style={{ backgroundColor: process.color }} className="grid h-11 w-11 place-items-center rounded-xl text-xs font-black not-italic text-[#182239]">{processed ? "✓" : process.id}</i>
              <span className="min-w-0"><strong className="block truncate text-sm sm:text-base">{process.name}</strong><small className="mt-1 block text-xs text-[#8191aa]">CPU Burst</small></span>
              <b style={{ color: process.color }} className="text-2xl">{process.burst}<small className="ml-1 text-xs">ms</small></b>
            </button>;
          })}</div>
        </section>

        <div className="flex flex-col items-center justify-center text-[#8192ad]"><span className="text-4xl max-lg:rotate-90">→</span><small className="mt-1 text-[10px] font-black tracking-[.12em]">DISPATCH</small></div>

        <section className="flex flex-col justify-center rounded-[1.25rem] border border-[#8da5ff]/20 bg-[#091728]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,.2)]">
          <div className="relative flex h-40 flex-col items-center justify-center rounded-[1.4rem] border-8 border-[#58709e] bg-[repeating-linear-gradient(45deg,#18294a_0_10px,#1e3155_10px_20px)] shadow-[inset_0_0_0_2px_rgba(169,188,223,.2),0_12px_30px_rgba(0,0,0,.35)]"><small className="text-[10px] font-black tracking-[.16em] text-[#91a7d0]">OS LAB</small><strong className="my-1 font-mono text-5xl">CPU</strong><i className="rounded-lg bg-[#73dfa8]/10 px-3 py-1 text-xs font-black not-italic tracking-widest text-[#73dfa8]">{complete ? "DONE" : order.length ? order[order.length - 1] : "IDLE"}</i></div>
          <div className="mt-6 flex flex-col text-center"><small className="text-[10px] font-black tracking-widest text-[#6b7c98]">RULE</small><strong className="mt-2 text-sm">가장 짧은 작업부터</strong><span className="mt-1 text-xs text-[#8191aa]">SJF · Non-preemptive</span></div>
        </section>
      </div>

      <section className="mt-4 rounded-[1.25rem] border border-[#8da5ff]/20 bg-[#091728]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,.2)]">
        <ZoneTitle title="EXECUTION TIMELINE" subtitle="COMPLETED ORDER" />
        <div className="mt-4 flex min-h-20 items-stretch gap-2 overflow-hidden rounded-xl bg-[#06111e] p-1">{order.length === 0 ? <em className="m-auto text-sm not-italic text-[#5f718d]">프로세스를 선택하면 실행 순서가 여기에 표시됩니다.</em> : order.map((id, index) => { const process = PROCESSES.find((item) => item.id === id)!; return <div key={id} style={{ flexGrow: process.burst, backgroundColor: `${process.color}35`, borderBottomColor: process.color }} className="relative flex min-w-20 items-center justify-center gap-2 border-b-4"><b className="text-base">{id}</b><span style={{ color: process.color }} className="text-sm font-bold">{process.burst}ms</span><small className="absolute right-2 top-1 text-[10px] text-white/45">#{index + 1}</small></div>; })}</div>
      </section>

      <div className={`mt-4 flex min-h-20 flex-wrap items-center gap-4 rounded-2xl border p-4 ${complete ? "border-[#73dfa8]/30 bg-[#73dfa8]/[.06]" : "border-[#8da5ff]/20 bg-[#101c31]"}`}><i className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black not-italic ${complete ? "bg-[#73dfa8] text-[#0a3b2a]" : "bg-[#8da5ff]/15 text-[#8da5ff]"}`}>{complete ? "✓" : "i"}</i><span className="flex flex-1 flex-col"><strong className="text-base">{complete ? "SJF 스케줄링 완료!" : feedback}</strong><small className="mt-1 text-sm text-[#8292ac]">{complete ? "실행 순서를 확인한 뒤 제출하세요." : "Ready Queue를 비교한 뒤 선택해 보세요."}</small></span>{complete && <button onClick={onDone} className="rounded-xl bg-gradient-to-r from-[#73dfa8] to-[#ffd06b] px-6 py-3 text-sm font-black text-[#0a3024] shadow-[0_5px_0_#174c39]">제출</button>}</div>
    </section>
  </main>;
}

function ZoneTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="flex items-center justify-between"><span className="text-xs font-black tracking-[.14em] text-[#d2dcf2]">{title}</span><small className="text-[10px] font-black tracking-[.12em] text-[#62738e]">{subtitle}</small></div>; }
const PAGE_TABLE: Record<number, string> = { 0: "Frame 3", 1: "Frame 0", 2: "Frame 1", 3: "Frame 2", 4: "Storage에서 가져오기" };
const PAGE_TASKS = [0, 3, 4];
function MissionThree({ onDone, onMap }: MissionProps) {
  const [step, setStep] = useState(0); const [errors, setErrors] = useState(0); const [feedback, setFeedback] = useState("Page Table을 보고 Page 0의 위치를 찾으세요.");
  const page = PAGE_TASKS[step];
  function answer(value: string) { if (value !== PAGE_TABLE[page]) { setErrors((v) => v + 1); return setFeedback("Page Table을 다시 확인해 보세요."); } if (step === PAGE_TASKS.length - 1) return onDone(); setStep((v) => v + 1); setFeedback(`정답! 이제 Page ${PAGE_TASKS[step + 1]}의 위치를 찾으세요.`); }
  return <MissionShell number={3} title="Memory Paging" subtitle="Page Table을 이용해 Virtual Memory의 Page를 찾으세요." onMap={onMap} status={`${step}/3 · 오류 ${errors}`}>
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-[1.5rem] border border-cyan-200/15 bg-white/[.035] p-5"><Tag>PAGE TABLE</Tag><div className="mt-4 space-y-2">{Object.entries(PAGE_TABLE).map(([p, frame]) => <div key={p} className="flex justify-between rounded-xl bg-black/20 px-4 py-3 text-sm"><strong>Page {p}</strong><span className="text-cyan-200">{frame}</span></div>)}</div></div>
      <div className="flex flex-col justify-center"><Tag>CHALLENGE {step + 1} / 3</Tag><h2 className="mt-3 text-3xl font-black">Page {page}는 어디에 있나요?</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Frame 0", "Frame 1", "Frame 2", "Frame 3", "Storage에서 가져오기"].map((v) => <button key={v} onClick={() => answer(v)} className="rounded-2xl border border-cyan-200/15 bg-white/[.04] p-4 text-left font-bold hover:border-cyan-300/50 hover:bg-cyan-300/10">{v}</button>)}</div><Feedback>{feedback}</Feedback></div>
    </div>
  </MissionShell>;
}

const REQUESTS = [18, 40, 72, 95];
type SeekStep = { from: number; to: number; distance: number };
function MissionFour({ onDone, onMap }: MissionProps) {
  const [tutorial, setTutorial] = useState(true);
  const [head, setHead] = useState(50);
  const [remaining, setRemaining] = useState(REQUESTS);
  const [history, setHistory] = useState<SeekStep[]>([]);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState("현재 Head에서 가장 가까운 Request를 선택하세요.");
  const [conceptAnswer, setConceptAnswer] = useState<"yes" | "no" | null>(null);
  const requestsDone = remaining.length === 0;
  const complete = requestsDone && conceptAnswer === "yes";
  const totalSeek = history.reduce((sum, step) => sum + step.distance, 0);

  function selectRequest(value: number) {
    if (requestsDone) return;
    const nearest = [...remaining].sort((a, b) => Math.abs(a - head) - Math.abs(b - head))[0];
    if (value !== nearest) {
      setErrors((count) => count + 1);
      setFeedback(`Track ${nearest}가 현재 Head에 더 가까워요.`);
      return;
    }
    const distance = Math.abs(value - head);
    setHistory((steps) => [...steps, { from: head, to: value, distance }]);
    setHead(value);
    setRemaining((requests) => requests.filter((request) => request !== value));
    setFeedback(`Track ${value} 처리 완료 · Head가 ${distance}만큼 이동했습니다.`);
  }

  function answerConcept(answer: "yes" | "no") {
    setConceptAnswer(answer);
    if (answer === "yes") setFeedback("맞아요! 가까운 요청만 계속 오면 먼 요청이 오래 기다릴 수 있어요.");
    else { setErrors((count) => count + 1); setFeedback("SSTF는 먼 Request가 계속 밀리는 Starvation이 생길 수 있어요."); }
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_18%_10%,#264b50,transparent_28%),linear-gradient(#07151e,#10252d_65%,#111d24)] text-white">
    <header className="grid h-20 grid-cols-[7rem_1fr_auto] items-center gap-4 border-b border-cyan-200/15 bg-[#071219]/90 px-4 sm:px-8 lg:px-12">
      <button onClick={onMap} className="rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10">← 지도</button>
      <div className="flex flex-col"><small className="text-[10px] font-black tracking-[.16em] text-[#78949d]">OS LAB · MISSION 04</small><strong className="mt-1 text-lg">Disk Scheduling · SSTF</strong></div>
      <span className="grid h-11 min-w-16 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-200">{history.length}/4</span>
    </header>

    <section className="mx-auto w-[min(1080px,calc(100%-2rem))] py-9 sm:py-12">
      <div className="grid items-end gap-7 md:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-black tracking-[.18em] text-[#82c6d0]">SHORTEST SEEK TIME FIRST</p><h1 className="mt-3 text-4xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl">HDD Head와 가장 가까운<br /><em className="not-italic text-[#8ce5cb]">Request</em>를 선택하세요</h1><p className="mt-5 text-base font-semibold leading-7 text-[#a9bec4]">Head 이동 거리가 짧은 Request부터 처리해 전체 Seek Time을 줄여 보세요.</p></div>
        <div className="grid min-w-56 grid-cols-2 overflow-hidden rounded-2xl border border-cyan-200/20 bg-cyan-200/[.04]"><div className="p-4"><small className="text-[10px] font-black tracking-widest text-[#79959f]">HEAD</small><strong className="mt-1 block text-3xl text-cyan-200">{head}</strong></div><div className="border-l border-cyan-200/15 p-4"><small className="text-[10px] font-black tracking-widest text-[#79959f]">TOTAL SEEK</small><strong className="mt-1 block text-3xl text-[#8ce5cb]">{totalSeek}</strong></div><span className="col-span-2 border-t border-cyan-200/15 px-4 py-2 text-center text-xs font-black tracking-widest text-amber-200">ERRORS · {errors}</span></div>
      </div>

      <section className="mt-8 rounded-[1.5rem] border border-cyan-200/20 bg-[#091a22]/90 p-5 shadow-[0_25px_60px_rgba(0,0,0,.25)] sm:p-7">
        <ZoneTitle title="HDD TRACK MAP" subtitle="TRACK 0 — 100" />
        <div className="mt-7 flex justify-between px-1 text-xs font-bold text-[#66838c]">{[0, 20, 40, 60, 80, 100].map((tick) => <span key={tick}>{tick}</span>)}</div>
        <div className="relative mx-3 mt-6 h-36 border-t-2 border-cyan-100/20 bg-[repeating-linear-gradient(90deg,transparent_0_calc(20%-1px),rgba(120,180,190,.12)_calc(20%-1px)_20%)]">
          <i style={{ left: `${head}%` }} className="absolute top-0 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center not-italic transition-all duration-500"><b className="rounded-t-lg bg-[#8ce5cb] px-3 py-1 text-[10px] font-black text-[#07251f]">HEAD</b><strong className="grid h-12 w-12 place-items-center rounded-full border-4 border-[#8ce5cb] bg-[#12323a] text-lg shadow-[0_0_25px_rgba(140,229,203,.35)]">{head}</strong></i>
          {remaining.map((request) => <button key={request} style={{ left: `${request}%` }} onClick={() => selectRequest(request)} className="absolute top-16 z-10 -translate-x-1/2 rounded-xl border border-amber-200/35 bg-amber-200/10 px-3 py-2 text-amber-100 transition hover:-translate-x-1/2 hover:-translate-y-1"><b className="block text-base">{request}</b><small className="text-[9px] font-black tracking-wider">REQUEST</small></button>)}
          {history.map((step) => <span key={step.to} style={{ left: `${step.to}%` }} className="absolute top-16 -translate-x-1/2 text-xl font-black text-[#8ce5cb]">✓</span>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 px-4 py-3 text-sm"><span className="text-[#90a7ad]">CURRENT HEAD <b className="ml-2 text-cyan-200">TRACK {head}</b></span><i className="not-italic text-[#6d8991]">가까운 Request를 클릭하세요</i></div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-[1.25rem] border border-cyan-200/20 bg-[#091a22]/90 p-5"><ZoneTitle title="REQUEST QUEUE" subtitle="SSTF PICK" /><div className="mt-4 space-y-2">{remaining.length === 0 ? <em className="block rounded-xl bg-black/20 p-5 text-center text-sm not-italic text-[#789097]">모든 Request 처리 완료</em> : remaining.map((request) => <button key={request} onClick={() => selectRequest(request)} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-xl border border-cyan-200/10 bg-white/[.035] p-3 text-left hover:border-cyan-200/35"><i className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-200/10 text-xs font-black not-italic text-cyan-200">R</i><span><b className="block text-base">TRACK {request}</b><small className="text-xs text-[#789097]">HEAD에서 거리</small></span><strong className="text-xl text-amber-200">{Math.abs(request - head)}</strong></button>)}</div></section>
        <section className="rounded-[1.25rem] border border-cyan-200/20 bg-[#091a22]/90 p-5"><ZoneTitle title="SEEK HISTORY" subtitle={`TOTAL · ${totalSeek}`} /><div className="mt-4 space-y-2">{history.length === 0 ? <em className="block rounded-xl bg-black/20 p-5 text-center text-sm not-italic text-[#789097]">처리 결과가 여기에 기록됩니다.</em> : history.map((step, index) => <span key={`${step.to}-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 rounded-xl bg-white/[.035] px-4 py-3"><b className="text-base">{step.from}</b><i className="not-italic text-cyan-200">→</i><strong className="text-base text-[#8ce5cb]">{step.to}</strong><small className="rounded-lg bg-amber-200/10 px-2 py-1 text-xs font-black text-amber-200">+{step.distance}</small></span>)}</div></section>
      </div>

      {requestsDone && <section className="mt-4 grid items-center gap-5 rounded-[1.25rem] border border-violet-300/20 bg-violet-300/[.06] p-5 md:grid-cols-[1fr_auto]"><div><small className="text-[10px] font-black tracking-[.16em] text-violet-200">FINAL QUESTION</small><h2 className="mt-2 text-xl font-black sm:text-2xl">SSTF에서도 먼 Request가 너무 오래 기다릴 수 있을까요?</h2></div><div className="grid gap-2 sm:grid-cols-2"><button onClick={() => answerConcept("no")} className={`rounded-xl border p-3 text-sm font-bold ${conceptAnswer === "no" ? "border-red-300 bg-red-300/10 text-red-200" : "border-white/15"}`}>아니요, 모두 공평해요</button><button onClick={() => answerConcept("yes")} className={`rounded-xl border p-3 text-sm font-bold ${conceptAnswer === "yes" ? "border-[#8ce5cb] bg-[#8ce5cb]/10 text-[#8ce5cb]" : "border-white/15"}`}>네, Starvation이 생길 수 있어요</button></div></section>}

      <div className={`mt-4 flex min-h-20 flex-wrap items-center gap-4 rounded-2xl border p-4 ${complete ? "border-[#8ce5cb]/35 bg-[#8ce5cb]/[.06]" : "border-cyan-200/20 bg-[#10242b]"}`}><i className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black not-italic ${complete ? "bg-[#8ce5cb] text-[#07342a]" : "bg-cyan-200/10 text-cyan-200"}`}>{complete ? "✓" : "i"}</i><span className="flex flex-1 flex-col"><strong className="text-base">{complete ? "SSTF Disk Scheduling을 완료했습니다." : feedback}</strong><small className="mt-1 text-sm text-[#829aa1]">{complete ? "Seek History를 확인한 뒤 제출하세요." : requestsDone ? "마지막 질문에 답해 보세요." : "현재 Head와 각 Request의 거리를 비교하세요."}</small></span>{complete && <button onClick={onDone} className="rounded-xl bg-gradient-to-r from-[#8ce5cb] to-cyan-300 px-6 py-3 text-sm font-black text-[#07342a] shadow-[0_5px_0_#245b50]">제출</button>}</div>
    </section>

    {tutorial && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02090d]/80 p-5 backdrop-blur-sm"><section className="relative grid w-full max-w-3xl items-center gap-6 rounded-[2rem] border border-cyan-200/25 bg-[#0b2028] p-7 shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:grid-cols-[10rem_1fr] sm:p-9"><button onClick={() => setTutorial(false)} className="absolute right-5 top-4 text-2xl text-white/40">×</button><Image src="/os-penguin.png" alt="OS Lab 안내자 펭귄" width={160} height={160} className="mx-auto h-40 w-40 object-contain" /><div><Tag>먼저 한 번 같이 해봐요!</Tag><h2 className="mt-3 text-2xl font-black sm:text-3xl">Head 50에서 가장 가까운 Request는?</h2><div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center"><span className="rounded-xl bg-white/[.05] p-3 text-sm font-bold">TRACK 40<small className="mt-1 block text-[#8ce5cb]">거리 10</small></span><i className="not-italic">←</i><b className="rounded-xl bg-[#8ce5cb] p-3 text-sm text-[#07342a]">HEAD 50</b><i className="not-italic">→</i><span className="rounded-xl bg-white/[.05] p-3 text-sm font-bold">TRACK 72<small className="mt-1 block text-amber-200">거리 22</small></span></div><p className="mt-5 text-sm font-semibold leading-7 text-white/60">SSTF는 이동 거리가 가장 짧은 Request를 먼저 처리해요. 여기서는 Track 40이 가장 가깝습니다.</p><button onClick={() => setTutorial(false)} className="mt-5 w-full rounded-full bg-[#8ce5cb] px-6 py-3 text-base font-black text-[#07342a]">이해했어요 · 시작하기</button></div></section></div>}
  </main>;
}
function RewardOne({ onContinue }: { onContinue: () => void }) { return <Reward number={1} title="랩 Codex 이용권" accent="text-[#39ffb6]" onContinue={onContinue}><div className="rounded-[1.5rem] border border-[#39ffb6]/30 bg-[#39ffb6]/[.07] p-6"><Tag>CODEX / LAB PREMIUM ACCESS</Tag><div className="mt-5 grid grid-cols-2 gap-3 text-base"><Stat label="ACCURACY" value="100%" /><Stat label="NEXT STATUS" value="관리자 승인 대기" /></div></div><Note>랩 관리자 확인 후 계정 이용 권한이 활성화됩니다.</Note></Reward>; }
function RewardTwo({ onContinue }: { onContinue: () => void }) { return <Reward number={2} title="₩150,000 상품권" accent="text-amber-300" onContinue={onContinue}><div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/[.07] p-6"><Tag>REWARD VOUCHER</Tag><strong className="mt-4 block text-4xl text-amber-200">₩150,000</strong><div className="mt-5 grid grid-cols-2 gap-3 text-base"><Stat label="ALGORITHM" value="SJF" /><Stat label="NEXT STATUS" value="관리자 승인 대기" /></div></div><Note>보상 지급은 랩 관리자 확인 후 진행됩니다.</Note></Reward>; }
function RewardThree({ onContinue }: { onContinue: () => void }) { return <Reward number={3} title="랩 출입문 카드" accent="text-cyan-300" onContinue={onContinue}><div className="rounded-[1.5rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/20 to-violet-400/10 p-6"><div className="flex justify-between text-[10px] font-black tracking-[.2em]"><span>OS LAB / ACCESS</span><span>LAB</span></div><strong className="mt-12 block text-2xl">MEMBER AUTHORIZED</strong><p className="mt-2 text-sm tracking-[.4em] text-white/45">•••• 03</p></div><p className="mt-4 text-sm font-bold text-cyan-200">랩 출입 권한이 활성화되었습니다.</p><Note>실물 카드 지급은 랩 관리자 확인 후 진행됩니다.</Note></Reward>; }

function Reward({ number, title, accent, children, onContinue }: { number: number; title: string; accent: string; children: React.ReactNode; onContinue: () => void }) { return <Shell center><section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-emerald-300/20 bg-[#0b1b2b] p-7 text-center sm:p-10"><div className="flex justify-between text-xs font-black tracking-[.18em] text-white/40"><span>OS LAB · MISSION REPORT</span><span>{String(number).padStart(2, "0")} / COMPLETE</span></div><div className="mt-8 flex flex-col items-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#39ffb6] text-3xl font-black text-[#07131f]">✓</div><Tag>MISSION SUCCESS</Tag><h1 className={`mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl ${accent}`}>{title}</h1><p className="mt-4 text-base font-semibold leading-7 text-white/55">미션을 완료하고 새로운 보상을 획득했습니다.</p><div className="mt-7 w-full max-w-xl text-left">{children}</div></div><Primary onClick={onContinue}>보상 확인 · 맵으로 →</Primary></section></Shell>; }

function ChapterComplete({ saving, error, onEnter }: { saving: boolean; error: string; onEnter: () => void }) { return <Shell center><section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-cyan-300/25 bg-[#0b1b2b] p-7 sm:p-10"><div className="flex justify-between text-[9px] font-black tracking-[.18em] text-cyan-200/50"><span>OS LAB · CHAPTER REPORT</span><span>04 / COMPLETE</span></div><div className="mt-9 grid gap-8 md:grid-cols-[1fr_.8fr]"><div><Tag>CHAPTER 01 CLEAR</Tag><h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">ALL MISSIONS<br /><span className="text-[#39ffb6]">COMPLETE</span></h1><p className="mt-5 text-base leading-8 text-white/60">OS Abstraction부터 Disk Scheduling까지, 운영체제의 핵심 원리를 모두 탐험했습니다.</p></div><div className="space-y-2">{MISSIONS.map((m, i) => <div key={m[0]} className="flex items-center gap-3 rounded-xl bg-white/[.04] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#39ffb6] text-xs font-black text-[#07131f]">✓</span><span><small className="block text-[8px] text-white/30">MISSION 0{i + 1}</small><strong className="text-sm">{m[0]}</strong></span></div>)}</div></div><div className="mt-8 flex items-center gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.07] p-5 sm:gap-6"><Image src="/os-penguin.png" alt="축하하는 OS Lab 안내 펭귄" width={112} height={112} className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" /><div className="relative rounded-2xl bg-white/[.08] p-5 before:absolute before:-left-3 before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[10px] before:border-r-[12px] before:border-y-transparent before:border-r-white/[.08]"><Tag>OS LAB GUIDE</Tag><p className="mt-2 text-sm font-semibold leading-7 text-white/70">축하해요! 모든 도전을 완료하고 <strong className="text-[#39ffb6]">연구실 생활에 필요한 아이템</strong>을 모두 모았어요. 이제 <strong className="text-cyan-200">랩장님</strong>을 만나 아이템을 받아 보세요!</p></div></div>{error && <p className="mt-4 text-center text-sm font-bold text-red-300">{error}</p>}<button disabled={saving} onClick={onEnter} className="mt-7 w-full rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-7 py-4 text-base font-black text-[#031119] shadow-[0_6px_0_#155f70] disabled:opacity-40">{saving ? "저장 중..." : "LABLOG 메인으로 →"}</button></section></Shell>; }

type MissionProps = { onDone: () => void; onMap: () => void };
function MissionShell({ number, title, subtitle, status, onMap, children }: { number: number; title: string; subtitle: string; status: string; onMap: () => void; children: React.ReactNode }) { return <Shell><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><button onClick={onMap} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white/60">← CHAPTER MAP</button><span className="text-xs font-black text-cyan-300">MISSION {String(number).padStart(2, "0")} · {status}</span></header><div className="mt-8"><Tag>CHAPTER 01 · MISSION {String(number).padStart(2, "0")}</Tag><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-6xl">{title}</h1><p className="mt-3 text-base font-semibold leading-7 text-white/55">{subtitle}</p></div><div className="mt-8">{children}</div></div></Shell>; }
function Shell({ children, center = false }: { children: React.ReactNode; center?: boolean }) { return <main className={`relative min-h-screen overflow-hidden bg-[#07131f] p-5 text-white sm:p-8 ${center ? "flex items-center justify-center" : ""}`}><div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(77,225,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(77,225,255,.13) 1px,transparent 1px)", backgroundSize: "38px 38px" }} /><div className="relative z-10 w-full">{children}</div></main>; }
function Tag({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-xs font-black tracking-[.2em] text-[#39ffb6]">{children}</p>; }
function Choice({ done = false, active = false, onClick, title, subtitle, badge, reverse = false }: { done?: boolean; active?: boolean; onClick: () => void; title: string; subtitle: string; badge: string; reverse?: boolean }) { return <button disabled={done} onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition sm:min-h-20 sm:p-4 ${active ? "border-[#39ffb6] bg-[#39ffb6]/15" : done ? "border-emerald-300/20 bg-emerald-300/10 opacity-50" : "border-cyan-100/10 bg-white/[.04] hover:border-cyan-300/40 hover:bg-cyan-300/[.07]"} ${reverse ? "flex-row-reverse text-right" : ""}`}><i className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-[10px] font-black not-italic text-cyan-200">{done ? "✓" : badge}</i><span className="min-w-0 flex-1"><strong className="block truncate text-base">{title}</strong><small className="mt-1 block truncate text-xs text-white/45 sm:text-sm">{subtitle}</small></span></button>; }
function Feedback({ children }: { children: React.ReactNode }) { return <div role="status" className="mt-5 rounded-2xl border border-cyan-200/10 bg-cyan-300/[.05] px-5 py-4 text-sm font-bold leading-6 text-cyan-50/70">💡 {children}</div>; }
function Primary({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} className="mt-7 w-full rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-7 py-4 text-base font-black text-[#031119] shadow-[0_6px_0_#155f70] disabled:opacity-50">{children}</button>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-black/20 p-3"><small className="block text-[10px] font-black tracking-wider text-white/40">{label}</small><strong className="mt-1 block">{value}</strong></div>; }
function Note({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-sm leading-6 text-white/45">※ {children}</p>; }