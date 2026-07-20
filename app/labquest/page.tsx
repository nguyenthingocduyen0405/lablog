"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";

type Screen = "loading" | "intro" | "map" | "m1" | "r1" | "m2" | "r2" | "m3" | "r3" | "m4" | "complete" | "saving";
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
  ["OS Abstraction", "하드웨어와 OS 추상화 연결", "+100 XP · Codex 이용권"],
  ["CPU Scheduling", "SJF로 프로세스 실행 순서 결정", "+150 XP · ₩120,000 상품권"],
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
      setScreen(progress.length ? (progress.includes(4) ? "complete" : "map") : "intro");
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
        <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/55">CPU, Memory, Storage를 따라 OS의 핵심을 하나씩 탐험해 보세요. 네 개의 미션과 특별한 보상이 기다리고 있습니다.</p>
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
  const xp = (completed.includes(1) ? 100 : 0) + (completed.includes(2) ? 150 : 0);
  return <Shell>
    <div className="mx-auto max-w-5xl">
      <header className="flex items-start justify-between gap-5"><div><Tag>CHAPTER 01</Tag><h1 className="mt-2 text-4xl font-black sm:text-6xl">운영체제의 비밀 정원</h1><p className="mt-3 text-sm text-white/50">미션을 완료하면 다음 미션과 보상이 열립니다.</p></div><div className="rounded-2xl border border-cyan-200/15 bg-white/5 px-5 py-3 text-right"><small className="block text-[9px] font-black tracking-widest text-white/35">RESEARCH XP</small><strong className="text-2xl text-[#39ffb6]">{xp} XP</strong></div></header>
      <div className="mt-10 space-y-4">
        {MISSIONS.map((mission, index) => {
          const number = index + 1; const done = completed.includes(number); const unlocked = number === 1 || completed.includes(number - 1);
          return <button key={mission[0]} disabled={!unlocked} onClick={() => onSelect(number)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[1.5rem] border p-5 text-left transition ${done ? "border-emerald-300/30 bg-emerald-300/[.08]" : unlocked ? "border-cyan-200/20 bg-white/[.045] hover:-translate-y-1 hover:border-cyan-300/50" : "border-white/5 bg-white/[.02] opacity-40"}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black ${done ? "bg-[#39ffb6] text-[#07131f]" : "bg-cyan-300/10 text-cyan-200"}`}>{done ? "✓" : String(number).padStart(2, "0")}</span>
            <span><small className="text-[9px] font-black tracking-[.18em] text-cyan-300">MISSION {String(number).padStart(2, "0")}</small><strong className="mt-1 block text-xl">{mission[0]}</strong><span className="mt-1 block text-xs text-white/40">{mission[1]}</span></span>
            <span className="text-right text-xs font-bold text-white/45">{unlocked ? mission[2] : "LOCKED"}<b className="ml-3 text-lg text-cyan-300">{unlocked ? "→" : "🔒"}</b></span>
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
  { id: "P1", name: "논문 PDF 분석", burst: 5 }, { id: "P2", name: "센서 로그 저장", burst: 2 },
  { id: "P3", name: "실험 영상 처리", burst: 7 }, { id: "P4", name: "결과 그래프 생성", burst: 3 },
];
function MissionTwo({ onDone, onMap }: MissionProps) {
  const [order, setOrder] = useState<string[]>([]); const [errors, setErrors] = useState(0); const [feedback, setFeedback] = useState("CPU Burst가 가장 짧은 프로세스를 선택하세요.");
  const remaining = PROCESSES.filter((p) => !order.includes(p.id));
  function select(id: string) { const shortest = [...remaining].sort((a, b) => a.burst - b.burst)[0]; if (id !== shortest.id) { setErrors((v) => v + 1); return setFeedback(`${shortest.id}의 CPU Burst가 더 짧아요.`); } setOrder((v) => [...v, id]); setFeedback(`${id} 선택 완료! 다음으로 짧은 프로세스를 찾으세요.`); }
  return <MissionShell number={2} title="CPU Scheduling" subtitle="비선점형 SJF 알고리즘으로 실행 순서를 완성하세요." onMap={onMap} status={`오류 ${errors}`}>
    <div className="grid gap-3 sm:grid-cols-2">{PROCESSES.map((p) => <Choice key={p.id} done={order.includes(p.id)} onClick={() => select(p.id)} title={`${p.id} · ${p.name}`} subtitle={`CPU Burst ${p.burst}ms`} badge={p.id} />)}</div>
    <div className="mt-6 rounded-2xl bg-white/[.04] p-5"><Tag>EXECUTION QUEUE</Tag><div className="mt-3 flex min-h-14 flex-wrap gap-2">{order.map((id, i) => <span key={id} className="rounded-xl bg-cyan-300/15 px-4 py-3 font-black text-cyan-200">{i + 1}. {id}</span>)}</div></div>
    <Feedback>{feedback}</Feedback>
    {order.length === 4 && <Primary onClick={onDone}>결과 제출하기 →</Primary>}
  </MissionShell>;
}

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
function MissionFour({ onDone, onMap }: MissionProps) {
  const [head, setHead] = useState(50); const [done, setDone] = useState<number[]>([]); const [total, setTotal] = useState(0); const [errors, setErrors] = useState(0); const [feedback, setFeedback] = useState("현재 Head 50에서 가장 가까운 Request를 선택하세요."); const [quiz, setQuiz] = useState(false);
  const remaining = REQUESTS.filter((v) => !done.includes(v));
  function select(value: number) { const nearest = [...remaining].sort((a, b) => Math.abs(a - head) - Math.abs(b - head))[0]; if (value !== nearest) { setErrors((v) => v + 1); return setFeedback(`Track ${nearest}가 현재 Head에서 가장 가까워요.`); } const distance = Math.abs(value - head); const next = [...done, value]; setDone(next); setHead(value); setTotal((v) => v + distance); setFeedback(`Track ${value} 처리 완료 · 이동 거리 ${distance}`); if (next.length === 4) setQuiz(true); }
  function answer(correct: boolean) { if (correct) onDone(); else { setErrors((v) => v + 1); setFeedback("SSTF는 가까운 요청을 우선하므로 먼 요청에 Starvation이 생길 수 있어요."); } }
  return <MissionShell number={4} title="Disk Scheduling · SSTF" subtitle="현재 Head에서 가장 가까운 디스크 요청을 순서대로 처리하세요." onMap={onMap} status={`SEEK ${total} · 오류 ${errors}`}>
    <div className="rounded-[1.5rem] border border-cyan-200/15 bg-white/[.035] p-6"><div className="flex justify-between"><span className="text-sm text-white/45">CURRENT HEAD</span><strong className="text-3xl text-[#39ffb6]">{head}</strong></div><div className="mt-6 grid grid-cols-4 gap-3">{REQUESTS.map((v) => <button key={v} disabled={done.includes(v) || quiz} onClick={() => select(v)} className={`rounded-2xl border p-5 font-black ${done.includes(v) ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200 opacity-50" : "border-cyan-200/15 bg-black/20 text-cyan-200 hover:border-cyan-300/60"}`}>Track {v}</button>)}</div><div className="mt-5 text-xs text-white/40">처리 순서: 50 {done.map((v) => `→ ${v}`).join(" ")}</div></div>
    {quiz ? <div className="mt-6 rounded-[1.5rem] border border-violet-300/20 bg-violet-300/[.07] p-6"><Tag>FINAL QUESTION</Tag><h2 className="mt-3 text-xl font-black">SSTF에서도 먼 Request가 너무 오래 기다릴 수 있을까요?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => answer(true)} className="rounded-2xl bg-[#39ffb6] p-4 font-black text-[#07131f]">네, Starvation이 생길 수 있어요</button><button onClick={() => answer(false)} className="rounded-2xl border border-white/15 p-4 font-bold">아니요, 모두 공평해요</button></div></div> : <Feedback>{feedback}</Feedback>}
  </MissionShell>;
}

function RewardOne({ onContinue }: { onContinue: () => void }) { return <Reward number={1} title="랩 Codex 이용권" accent="text-[#39ffb6]" onContinue={onContinue}><div className="rounded-[1.5rem] border border-[#39ffb6]/30 bg-[#39ffb6]/[.07] p-6"><Tag>CODEX / LAB PREMIUM ACCESS</Tag><strong className="mt-4 block text-4xl">+100 XP</strong><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Stat label="ACCURACY" value="100%" /><Stat label="NEXT STATUS" value="관리자 승인 대기" /></div></div><Note>랩 관리자 확인 후 계정 이용 권한이 활성화됩니다.</Note></Reward>; }
function RewardTwo({ onContinue }: { onContinue: () => void }) { return <Reward number={2} title="₩120,000 상품권" accent="text-amber-300" onContinue={onContinue}><div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/[.07] p-6"><Tag>REWARD VOUCHER</Tag><strong className="mt-4 block text-4xl text-amber-200">₩120,000</strong><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Stat label="RESEARCH XP" value="+150 XP" /><Stat label="ALGORITHM" value="SJF" /></div></div><Note>보상 지급은 랩 관리자 확인 후 진행됩니다.</Note></Reward>; }
function RewardThree({ onContinue }: { onContinue: () => void }) { return <Reward number={3} title="랩 출입문 카드" accent="text-cyan-300" onContinue={onContinue}><div className="rounded-[1.5rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/20 to-violet-400/10 p-6"><div className="flex justify-between text-[10px] font-black tracking-[.2em]"><span>OS LAB / ACCESS</span><span>LAB</span></div><strong className="mt-12 block text-2xl">MEMBER AUTHORIZED</strong><p className="mt-2 text-sm tracking-[.4em] text-white/45">•••• 03</p></div><p className="mt-4 text-sm font-bold text-cyan-200">랩 출입 권한이 활성화되었습니다.</p><Note>실물 카드 지급은 랩 관리자 확인 후 진행됩니다.</Note></Reward>; }

function Reward({ number, title, accent, children, onContinue }: { number: number; title: string; accent: string; children: React.ReactNode; onContinue: () => void }) { return <Shell center><section className="w-full max-w-4xl rounded-[2rem] border border-emerald-300/20 bg-[#0b1b2b] p-7 sm:p-10"><div className="flex justify-between text-[9px] font-black tracking-[.18em] text-white/35"><span>OS LAB · MISSION REPORT</span><span>{String(number).padStart(2, "0")} / COMPLETE</span></div><div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_.9fr]"><div><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#39ffb6] text-2xl font-black text-[#07131f]">✓</div><Tag>MISSION SUCCESS</Tag><h1 className={`mt-3 text-5xl font-black tracking-[-.05em] ${accent}`}>{title}</h1><p className="mt-4 text-sm text-white/45">미션을 완료하고 새로운 보상을 획득했습니다.</p></div><div>{children}</div></div><Primary onClick={onContinue}>보상 확인 · 맵으로 →</Primary></section></Shell>; }

function ChapterComplete({ saving, error, onEnter }: { saving: boolean; error: string; onEnter: () => void }) { return <Shell center><section className="w-full max-w-5xl rounded-[2rem] border border-cyan-300/25 bg-[#0b1b2b] p-7 sm:p-10"><div className="flex justify-between text-[9px] font-black tracking-[.18em] text-cyan-200/50"><span>OS LAB · CHAPTER REPORT</span><span>04 / COMPLETE</span></div><div className="mt-9 grid gap-8 md:grid-cols-[1fr_.8fr]"><div><Tag>CHAPTER 01 CLEAR</Tag><h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">ALL MISSIONS<br /><span className="text-[#39ffb6]">COMPLETE</span></h1><p className="mt-5 text-sm leading-7 text-white/50">OS Abstraction부터 Disk Scheduling까지, 운영체제의 핵심 원리를 모두 탐험했습니다.</p></div><div className="space-y-2">{MISSIONS.map((m, i) => <div key={m[0]} className="flex items-center gap-3 rounded-xl bg-white/[.04] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#39ffb6] text-xs font-black text-[#07131f]">✓</span><span><small className="block text-[8px] text-white/30">MISSION 0{i + 1}</small><strong className="text-sm">{m[0]}</strong></span></div>)}</div></div><div className="mt-8 rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5"><Tag>NEXT ADVENTURE</Tag><p className="mt-2 text-sm font-semibold text-white/60">Chapter 1을 완료했습니다. 이제 LabLog의 메인 공간에서 연구 여정을 계속하세요.</p></div>{error && <p className="mt-4 text-center text-sm font-bold text-red-300">{error}</p>}<Primary disabled={saving} onClick={onEnter}>{saving ? "저장 중..." : "LABLOG 시작하기 →"}</Primary></section></Shell>; }

type MissionProps = { onDone: () => void; onMap: () => void };
function MissionShell({ number, title, subtitle, status, onMap, children }: { number: number; title: string; subtitle: string; status: string; onMap: () => void; children: React.ReactNode }) { return <Shell><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><button onClick={onMap} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white/60">← CHAPTER MAP</button><span className="text-xs font-black text-cyan-300">MISSION {String(number).padStart(2, "0")} · {status}</span></header><div className="mt-8"><Tag>CHAPTER 01 · MISSION {String(number).padStart(2, "0")}</Tag><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-6xl">{title}</h1><p className="mt-3 text-sm font-semibold text-white/45">{subtitle}</p></div><div className="mt-8">{children}</div></div></Shell>; }
function Shell({ children, center = false }: { children: React.ReactNode; center?: boolean }) { return <main className={`relative min-h-screen overflow-hidden bg-[#07131f] p-5 text-white sm:p-8 ${center ? "flex items-center justify-center" : ""}`}><div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(77,225,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(77,225,255,.13) 1px,transparent 1px)", backgroundSize: "38px 38px" }} /><div className="relative z-10 w-full">{children}</div></main>; }
function Tag({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-[10px] font-black tracking-[.2em] text-[#39ffb6]">{children}</p>; }
function Choice({ done = false, active = false, onClick, title, subtitle, badge, reverse = false }: { done?: boolean; active?: boolean; onClick: () => void; title: string; subtitle: string; badge: string; reverse?: boolean }) { return <button disabled={done} onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition sm:min-h-20 sm:p-4 ${active ? "border-[#39ffb6] bg-[#39ffb6]/15" : done ? "border-emerald-300/20 bg-emerald-300/10 opacity-50" : "border-cyan-100/10 bg-white/[.04] hover:border-cyan-300/40 hover:bg-cyan-300/[.07]"} ${reverse ? "flex-row-reverse text-right" : ""}`}><i className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-[10px] font-black not-italic text-cyan-200">{done ? "✓" : badge}</i><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><small className="mt-1 block truncate text-[10px] text-white/35">{subtitle}</small></span></button>; }
function Feedback({ children }: { children: React.ReactNode }) { return <div role="status" className="mt-5 rounded-2xl border border-cyan-200/10 bg-cyan-300/[.05] px-5 py-4 text-xs font-bold text-cyan-50/65">💡 {children}</div>; }
function Primary({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} className="mt-7 w-full rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-7 py-4 text-sm font-black text-[#031119] shadow-[0_6px_0_#155f70] disabled:opacity-50">{children}</button>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-black/20 p-3"><small className="block text-[8px] font-black tracking-wider text-white/35">{label}</small><strong className="mt-1 block">{value}</strong></div>; }
function Note({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-xs leading-5 text-white/35">※ {children}</p>; }