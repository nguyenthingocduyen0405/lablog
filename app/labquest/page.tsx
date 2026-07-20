"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";

type MissionPhase = "loading" | "intro" | "playing" | "complete" | "saving";
type AbstractionPair = {
  id: string;
  physical: string;
  physicalKo: string;
  abstraction: string;
  abstractionEn: string;
  icon: string;
};

const PAIRS: AbstractionPair[] = [
  { id: "cpu", physical: "CPU", physicalKo: "중앙처리장치", abstraction: "프로세스", abstractionEn: "Process", icon: "▣" },
  { id: "ram", physical: "RAM", physicalKo: "주기억장치", abstraction: "가상 메모리", abstractionEn: "Virtual Memory", icon: "▥" },
  { id: "disk", physical: "SSD / HDD", physicalKo: "저장장치", abstraction: "파일", abstractionEn: "File", icon: "▤" },
  { id: "network", physical: "네트워크 카드", physicalKo: "통신 장치", abstraction: "소켓", abstractionEn: "Socket", icon: "⌁" },
  { id: "keyboard", physical: "키보드", physicalKo: "입력 장치", abstraction: "입력 스트림", abstractionEn: "Input Stream", icon: "⌨" },
];
const ABSTRACTION_ORDER = ["disk", "keyboard", "cpu", "network", "ram"];

export default function LabQuestMissionOnePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<MissionPhase>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("왼쪽에서 물리 장치를 먼저 선택하세요.");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      if (!cancelled) { setUser(currentUser); setPhase("intro"); }
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  function startMission() {
    setSelectedId(null);
    setMatchedIds([]);
    setAttempts(0);
    setFeedback("왼쪽에서 물리 장치를 먼저 선택하세요.");
    setSaveError("");
    setPhase("playing");
  }

  function selectPhysical(pair: AbstractionPair) {
    if (matchedIds.includes(pair.id)) return;
    setSelectedId(pair.id);
    setFeedback(`${pair.physical}에 맞는 abstraction을 선택하세요.`);
  }

  function selectAbstraction(id: string) {
    if (!selectedId) {
      setFeedback("먼저 왼쪽 장치를 선택하세요.");
      return;
    }
    setAttempts((current) => current + 1);
    if (selectedId !== id) {
      setFeedback("아직 아니에요. 다른 abstraction을 찾아보세요.");
      return;
    }
    const nextMatched = [...matchedIds, id];
    setMatchedIds(nextMatched);
    setSelectedId(null);
    setFeedback("정답이에요! OS abstraction이 연결됐어요.");
    if (nextMatched.length === PAIRS.length) window.setTimeout(() => setPhase("complete"), 700);
  }

  async function enterLabLog() {
    if (!user || phase === "saving") return;
    setPhase("saving");
    setSaveError("");
    try {
      if (!user.onboardingCompletedAt) await completeOnboarding(user.id);
      router.replace("/mission");
    } catch {
      setPhase("complete");
      setSaveError("진행 상황을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  if (phase === "loading" || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#07131f] text-cyan-300"><p className="text-xs font-black tracking-[.24em]">LAB QUEST LOADING...</p></main>;
  }

  if (phase === "intro") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#07131f] px-5 py-8 text-white sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(77,225,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(77,225,255,.16) 1px,transparent 1px)", backgroundSize: "38px 38px" }} />
        <button type="button" onClick={() => router.push("/lab-tour")} aria-label="랩 투어로 돌아가기" className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white/60 hover:bg-white/20">←</button>
        <div className="relative z-10 mx-auto mt-2 max-w-5xl">
          <div className="flex items-center justify-between text-[10px] font-black tracking-[.2em] text-cyan-300"><span>OS LAB QUEST</span><span className="rounded-full border border-cyan-300/20 px-4 py-2">MISSION 01</span></div>
          <section className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_.9fr]">
            <div>
              <p className="text-[10px] font-black tracking-[.22em] text-[#39ffb6]">CHAPTER 01 · OPERATING SYSTEM</p>
              <h1 className="mt-4 text-5xl font-black tracking-[-.06em] sm:text-7xl">OS ABSTRACTION</h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-cyan-50/50">물리 장치와 운영체제의 추상화 개념을 연결하세요.</p>
              <div className="mt-8 flex items-center gap-4 rounded-[1.5rem] border border-cyan-200/15 bg-white/[.04] p-4">
                <Image src="/os-penguin.png" alt="OS Lab 안내자 펭귄" width={82} height={82} className="h-20 w-20 object-contain" />
                <div><span className="text-[9px] font-black tracking-[.16em] text-cyan-300">OS LAB 안내자</span><p className="mt-2 text-sm font-semibold leading-6 text-white/65"><strong className="text-white">첫 번째 미션에 오신 걸 환영해요!</strong><br />물리 장치와 OS abstraction의 관계를 찾아보세요.</p></div>
              </div>
              <button type="button" onClick={startMission} className="mt-8 rounded-full bg-gradient-to-r from-[#39ffb6] to-[#4de1ff] px-8 py-4 text-sm font-black text-[#031119] shadow-[0_7px_0_#155f70] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none">시작하기 →</button>
            </div>
            <div className="space-y-3 rounded-[2rem] border border-cyan-200/20 bg-[#0b1b2b]/90 p-5 shadow-[0_25px_80px_rgba(0,0,0,.3)] sm:p-7">
              <Layer icon="APP" title="APPLICATION" subtitle="앱 · 사용자" color="bg-violet-400/15 text-violet-200" />
              <Connector label="SYSTEM CALL" />
              <Layer icon="K" title="OS · KERNEL" subtitle="추상화 · 자원 관리" color="bg-cyan-400/15 text-cyan-200" />
              <Connector label="CONTROL" />
              <Layer icon="HW" title="HARDWARE" subtitle="CPU · Memory · Storage" color="bg-emerald-400/15 text-emerald-200" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "complete" || phase === "saving") {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07131f] p-5 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#4de1ff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <section className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-[#0b1b2b] p-6 shadow-[0_35px_100px_rgba(0,0,0,.5)] sm:p-10">
          <div className="flex items-center justify-between text-[9px] font-black tracking-[.18em] text-cyan-200/50"><span>OS LAB · MISSION REPORT</span><span>01 / COMPLETE</span></div>
          <div className="mt-10 grid items-center gap-8 md:grid-cols-[1fr_.85fr]">
            <div><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#39ffb6] text-3xl font-black text-[#031119]">✓</div><p className="mt-6 text-[10px] font-black tracking-[.2em] text-[#39ffb6]">MISSION SUCCESS</p><h1 className="mt-2 text-5xl font-black tracking-[-.06em]">첫 번째 미션<br /><em className="not-italic text-cyan-300">완료!</em></h1><p className="mt-5 text-sm font-semibold leading-7 text-white/50">물리 장치와 OS abstraction의 관계를 이해했어요.</p></div>
            <div className="rounded-[1.5rem] border border-[#39ffb6]/25 bg-[#39ffb6]/[.06] p-6"><p className="text-[9px] font-black tracking-[.18em] text-[#39ffb6]">REWARD UNLOCKED</p><strong className="mt-4 block text-3xl">+100 XP</strong><p className="mt-3 text-sm font-semibold text-white/45">LAB QUEST · OS ABSTRACTION</p></div>
          </div>
          <div className="mt-9 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[.04] p-4 text-center"><div><span className="text-[8px] font-black text-white/35">RESEARCH XP</span><strong className="mt-1 block text-lg">+100</strong></div><div><span className="text-[8px] font-black text-white/35">PAIRS</span><strong className="mt-1 block text-lg">5 / 5</strong></div><div><span className="text-[8px] font-black text-white/35">ATTEMPTS</span><strong className="mt-1 block text-lg">{attempts}</strong></div></div>
          {saveError && <p role="status" className="mt-5 text-center text-sm font-bold text-red-300">{saveError}</p>}
          <button type="button" disabled={phase === "saving"} onClick={enterLabLog} className="mt-7 w-full rounded-full bg-[#39ffb6] px-7 py-4 text-sm font-black text-[#031119] shadow-[0_6px_0_#147554] disabled:opacity-50">{phase === "saving" ? "저장 중..." : "LABLOG 시작하기 →"}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07131f] p-3 text-white sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[#0b1b2b] shadow-[0_30px_100px_rgba(0,0,0,.5)] sm:min-h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between border-b border-cyan-100/10 px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><Image src="/os-penguin.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" /><div><p className="text-xs font-black tracking-[.2em] text-cyan-200">OS LAB</p><p className="mt-1 text-[8px] font-bold text-white/30">OS ABSTRACTION LAB</p></div></div><div className="text-right"><span className="text-[9px] font-black tracking-[.16em] text-cyan-300">MISSION 01</span><strong className="ml-3 text-xl">{matchedIds.length}/{PAIRS.length}</strong></div></header>
        <div className="p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[9px] font-black tracking-[.18em] text-[#39ffb6]">OS ABSTRACTION LAB</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">물리 장치와 <em className="not-italic text-cyan-300">추상화 개념</em> 연결하기</h1></div><div className="rounded-2xl bg-white/[.05] px-5 py-3 text-right"><span className="block text-[8px] font-black text-white/35">획득 가능</span><strong className="text-xl text-[#39ffb6]">100 XP</strong><small className="ml-3 text-white/35">시도 {attempts}회</small></div></div>
          <p className="mt-6 rounded-2xl border border-cyan-200/10 bg-cyan-300/[.05] px-4 py-3 text-xs font-bold text-cyan-50/60"><span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300 text-[#07131f]">1</span>왼쪽 장치를 선택한 뒤, 알맞은 오른쪽 개념을 선택하세요.</p>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center text-[9px] font-black tracking-[.16em] text-white/30"><span>PHYSICAL DEVICE</span><span>CONNECT</span><span>OS ABSTRACTION</span></div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-6">
            <div className="space-y-3">{PAIRS.map((pair) => <MatchButton key={pair.id} disabled={matchedIds.includes(pair.id)} selected={selectedId === pair.id} matched={matchedIds.includes(pair.id)} onClick={() => selectPhysical(pair)} icon={pair.icon} title={pair.physical} subtitle={pair.physicalKo} />)}</div>
            <div className="flex items-center justify-center text-xl text-cyan-300/35">↔</div>
            <div className="space-y-3">{ABSTRACTION_ORDER.map((id) => { const pair=PAIRS.find((item)=>item.id===id)!; return <MatchButton key={id} disabled={matchedIds.includes(id)} matched={matchedIds.includes(id)} onClick={() => selectAbstraction(id)} icon="◇" title={pair.abstraction} subtitle={pair.abstractionEn} reverse />; })}</div>
          </div>
          <div role="status" className={`mt-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold ${feedback.startsWith("정답") ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-cyan-200/10 bg-white/[.03] text-white/50"}`}><span>● &nbsp;{feedback}</span><strong>{matchedIds.length * 20} XP</strong></div>
        </div>
      </section>
    </main>
  );
}

function Layer({ icon, title, subtitle, color }: { icon: string; title: string; subtitle: string; color: string }) {
  return <div className={`flex items-center gap-4 rounded-2xl p-4 ${color}`}><i className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-sm font-black not-italic">{icon}</i><span><strong className="block text-sm">{title}</strong><small className="text-xs opacity-55">{subtitle}</small></span></div>;
}
function Connector({ label }: { label: string }) { return <div className="flex items-center justify-center gap-3 text-[8px] font-black tracking-[.18em] text-cyan-200/35"><b className="text-lg">↓</b>{label}</div>; }
function MatchButton({ disabled, selected=false, matched=false, onClick, icon, title, subtitle, reverse=false }: { disabled: boolean; selected?: boolean; matched?: boolean; onClick: () => void; icon: string; title: string; subtitle: string; reverse?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition sm:min-h-20 sm:p-4 ${selected ? "border-[#39ffb6] bg-[#39ffb6]/15 shadow-[0_0_25px_rgba(57,255,182,.12)]" : matched ? "border-violet-300/20 bg-violet-300/10 opacity-55" : "border-cyan-100/10 bg-white/[.035] hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[.07]"} ${reverse ? "flex-row-reverse text-right" : ""}`}><i className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-lg font-black not-italic text-cyan-200 sm:h-11 sm:w-11">{matched ? "✓" : icon}</i><span className="min-w-0 flex-1"><strong className="block truncate text-xs sm:text-sm">{title}</strong><small className="mt-1 block truncate text-[9px] text-white/35 sm:text-[10px]">{subtitle}</small></span></button>;
}