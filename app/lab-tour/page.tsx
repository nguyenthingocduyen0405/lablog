"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CharacterAvatar from "../components/character-avatar";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";
import { DEFAULT_AVATAR_CONFIG, loadLabMembers, type LabMember } from "../lib/lab-social";

type TourStage = "overview" | "introductions" | "game" | "complete";

const seats = [
  { side: "left", x: 48, y: 31, scale: 0.62, depth: 1 },
  { side: "right", x: 62, y: 31, scale: 0.62, depth: 1 },
  { side: "left", x: 46, y: 43, scale: 0.76, depth: 2 },
  { side: "right", x: 63, y: 43, scale: 0.76, depth: 2 },
  { side: "left", x: 43, y: 56, scale: 0.92, depth: 3 },
  { side: "right", x: 65, y: 56, scale: 0.92, depth: 3 },
  { side: "left", x: 39, y: 70, scale: 1.08, depth: 4 },
  { side: "right", x: 68, y: 70, scale: 1.08, depth: 4 },
] as const;

const labObjects = [
  { id: "bookshelf", label: "책장", emoji: "📚", x: 9, y: 37, scale: 0.82, hint: "왼쪽 벽을 따라 길게 놓여 있어요." },
  { id: "meeting", label: "회의 테이블", emoji: "🗂️", x: 21, y: 57, scale: 0.95, hint: "책장 앞쪽의 긴 테이블을 찾아보세요." },
  { id: "trash", label: "쓰레기통", emoji: "🗑️", x: 36, y: 83, scale: 1.05, hint: "첫 번째 자리보다 앞쪽에 있어요." },
  { id: "water", label: "정수기", emoji: "🚰", x: 51, y: 82, scale: 1.08, hint: "쓰레기통과 전자레인지 사이에 있어요." },
  { id: "microwave", label: "전자레인지", emoji: "📻", x: 66, y: 82, scale: 1.05, hint: "첫 번째 자리 앞쪽 설비 줄의 오른쪽에 있어요." },
] as const;

export default function LabTourPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [stage, setStage] = useState<TourStage>("overview");
  const [speakerIndex, setSpeakerIndex] = useState(0);
  const [foundObjects, setFoundObjects] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      const loadedMembers = await loadLabMembers();
      if (!cancelled) {
        setUser(currentUser);
        setMembers(loadedMembers.slice(0, 8));
      }
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  const roomMembers = useMemo(() => Array.from({ length: 8 }, (_, index) => members[index] ?? null), [members]);
  const currentSpeaker = roomMembers[speakerIndex];
  const currentTarget = labObjects.find((object) => !foundObjects.includes(object.id));
  const speakerSeat = seats[speakerIndex];
  const cameraShift = stage === "introductions" && speakerSeat ? (speakerSeat.side === "left" ? 4 : -4) : 0;

  function startIntroductions() {
    const firstMember = roomMembers.findIndex(Boolean);
    setSpeakerIndex(Math.max(0, firstMember));
    setStage("introductions");
  }

  function nextIntroduction() {
    const nextMember = roomMembers.findIndex((member, index) => index > speakerIndex && Boolean(member));
    if (nextMember >= 0) {
      setSpeakerIndex(nextMember);
    } else {
      setStage("game");
      setFeedback("첫 번째 물건을 찾아보세요!");
    }
  }

  function selectObject(objectId: string) {
    if (stage !== "game" || !currentTarget) return;
    if (objectId !== currentTarget.id) {
      setFeedback(`조금 달라요. 힌트: ${currentTarget.hint}`);
      return;
    }
    const nextFound = [...foundObjects, objectId];
    setFoundObjects(nextFound);
    if (nextFound.length === labObjects.length) {
      setStage("complete");
      setFeedback("");
      return;
    }
    const nextTarget = labObjects.find((object) => !nextFound.includes(object.id));
    setFeedback(`정답! 다음은 ${nextTarget?.label}을 찾아보세요.`);
  }

  async function finishTour() {
    if (!user || isFinishing) return;
    setIsFinishing(true);
    try {
      if (!user.onboardingCompletedAt) await completeOnboarding(user.id);
      router.push("/mission");
    } finally {
      setIsFinishing(false);
    }
  }

  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#11130f] text-white"><p className="text-sm font-black text-white/40">OS LAB TOUR...</p></main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10120e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,216,77,.16),transparent_45%)]" />
      <header className="relative z-40 flex items-center justify-between px-5 py-4 sm:px-8">
        <div><p className="text-xs font-black tracking-[0.24em] text-[#ffd84d]">OS LAB</p><p className="mt-1 text-[10px] font-bold text-white/35">VIEW FROM THE ENTRANCE</p></div>
        <button type="button" onClick={finishTour} disabled={isFinishing} className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/60 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white">건너뛰기</button>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-3 pb-32 sm:px-8 sm:pb-28">
        <div className="relative h-[60vh] min-h-[31rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#d9dcd8] shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:h-[70vh]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-[3%] bg-[#1d201d] shadow-xl" />

          <div className="absolute inset-0 origin-center transition-transform duration-700 ease-out" style={{ transform: `translateX(${cameraShift}%) scale(${stage === "introductions" ? 1.035 : 1})` }}>
            <div className="absolute inset-x-[19%] top-0 h-[25%] bg-[linear-gradient(180deg,#f4f5f2,#dadeda)]"><span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-[.28em] text-stone-400/50">OS LAB</span></div>

            <div className="absolute bottom-0 left-0 top-0 w-[22%] bg-[linear-gradient(90deg,#e5e7e4,#f2f3f0)]" style={{ clipPath: "polygon(0 0,100% 24%,100% 100%,0 100%)" }} />
            <div className="absolute bottom-0 right-0 top-0 w-[27%] overflow-hidden bg-[linear-gradient(270deg,#d9ddda,#f2f3f0)]" style={{ clipPath: "polygon(0 24%,100% 0,100% 100%,0 100%)" }}>
              <div className="absolute left-[5%] top-[23%] h-[36%] w-[27%] -skew-y-6 bg-[#b8d8da] ring-2 ring-[#59635f] shadow-[inset_0_0_16px_rgba(70,110,110,.2)]"><span className="absolute inset-x-0 top-0 h-[44%] bg-white/65" /></div>
              <div className="absolute left-[37%] top-[17%] h-[40%] w-[27%] -skew-y-6 bg-[#b8d8da] ring-2 ring-[#59635f] shadow-[inset_0_0_16px_rgba(70,110,110,.2)]"><span className="absolute inset-x-0 top-0 h-[44%] bg-white/65" /></div>
              <div className="absolute left-[69%] top-[10%] h-[44%] w-[27%] -skew-y-6 bg-[#b8d8da] ring-2 ring-[#59635f] shadow-[inset_0_0_16px_rgba(70,110,110,.2)]"><span className="absolute inset-x-0 top-0 h-[44%] bg-white/65" /></div>
            </div>
            <div className="absolute inset-x-[18%] bottom-0 top-[23%] bg-[#aaa8a1]" style={{ clipPath: "polygon(36% 0,64% 0,100% 100%,0 100%)", backgroundImage: "linear-gradient(rgba(65,65,60,.11) 1px,transparent 1px)", backgroundSize: "100% 48px" }} />
            <div className="absolute bottom-0 left-1/2 top-[23%] w-px bg-white/25" />
            <div className="absolute left-[38%] top-[7%] h-2 w-[9%] rounded-full bg-white shadow-[0_0_18px_#fff]" /><div className="absolute right-[38%] top-[7%] h-2 w-[9%] rounded-full bg-white shadow-[0_0_18px_#fff]" />

            <div className="absolute left-[3%] top-[23%] z-10 h-[43%] w-[12%] bg-[#242825] shadow-xl"><div className="absolute inset-x-2 top-1/4 h-1 bg-white/15" /><div className="absolute inset-x-2 top-1/2 h-1 bg-white/15" /><div className="absolute inset-x-2 top-3/4 h-1 bg-white/15" /><span className="absolute inset-x-0 bottom-2 text-center text-[7px] font-black text-white/30">BOOKSHELF</span></div>
            <div className="absolute left-[14%] top-[51%] z-10 h-[13%] w-[20%] -skew-y-3 rounded bg-[#9b744d] shadow-[0_16px_18px_rgba(0,0,0,.28)]"><span className="absolute inset-[10%] rounded border border-white/15" /><span className="absolute inset-x-0 bottom-1 text-center text-[7px] font-black text-white/35">회의 TABLE</span></div>

            <div className="absolute bottom-[3%] left-[28%] z-[35] flex h-[17%] w-[46%] items-end justify-around rounded-t-xl bg-[#dedfdb] px-[4%] pb-2 shadow-[0_18px_24px_rgba(0,0,0,.3)]">
              <div className="h-[62%] w-[22%] rounded-t-md bg-[#777c78]"><span className="block pt-2 text-center text-[7px] font-black text-white/45">TRASH</span></div>
              <div className="h-[92%] w-[22%] rounded-t-md bg-[linear-gradient(90deg,#e7e9e7,#bfc5c1)]"><span className="block pt-2 text-center text-[7px] font-black text-stone-500">WATER</span></div>
              <div className="h-[68%] w-[30%] rounded-md bg-[#242724] ring-2 ring-[#aeb2ae]"><span className="block pt-2 text-center text-[7px] font-black text-white/45">MICROWAVE</span></div>
            </div>

            <div className="absolute bottom-0 left-0 z-[38] h-[39%] w-[19%] bg-[#242724] shadow-[12px_0_28px_rgba(0,0,0,.35)]"><div className="absolute bottom-[8%] right-[8%] top-[8%] w-[68%] bg-[#161916]"><span className="absolute right-2 top-1/2 h-2 w-2 rounded-full bg-[#ffd84d]" /></div><span className="absolute right-1 top-2 text-[7px] font-black tracking-widest text-white/25">DOOR</span></div>

            {seats.map((seat, index) => {
              const member = roomMembers[index];
              const isSpeaking = stage === "introductions" && index === speakerIndex && Boolean(member);
              return (
                <div key={index} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500" style={{ left: `${seat.x}%`, top: `${seat.y}%`, transform: `translate(-50%, -50%) scale(${seat.scale * (isSpeaking ? 1.22 : 1)})`, zIndex: 20 + seat.depth }}>
                  <div className={`absolute top-4 h-20 w-28 bg-[#d9dad7] shadow-[0_14px_16px_rgba(0,0,0,.28)] ${seat.side === "left" ? "left-1/2 origin-left -skew-y-3" : "right-1/2 origin-right skew-y-3"}`}><span className="absolute inset-x-0 bottom-0 h-[44%] bg-[#5e842f]" /></div>
                  <div className={`absolute top-12 h-10 w-24 bg-[#b88c5a] shadow-[0_10px_12px_rgba(0,0,0,.25)] ${seat.side === "left" ? "left-[42%]" : "right-[42%]"}`}><span className="absolute -top-4 left-4 h-7 w-10 rounded-sm bg-[#222724] ring-2 ring-[#969f99]" /></div>
                  <div className="relative flex flex-col items-center">
                    <span className={`mb-1 max-w-28 truncate rounded-full px-2.5 py-1 text-[9px] font-black shadow-lg backdrop-blur ${isSpeaking ? "bg-[#ffd84d] text-stone-950" : "bg-black/55 text-white"}`}>{member?.name ?? "빈 자리"}</span>
                    {member ? <div className={isSpeaking ? "lab-character-wave" : "lab-character-float"}><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={52} className="ring-2 ring-white/20" /></div> : <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[34%] border-2 border-dashed border-white/20 bg-black/10 text-white/30">+</div>}
                    <div className="mt-1 h-4 w-12 rounded-[50%] bg-black/25 blur-[2px]" />
                  </div>
                </div>
              );
            })}

            {labObjects.map((object) => {
              const found = foundObjects.includes(object.id);
              return <button key={object.id} type="button" disabled={stage !== "game" || found} onClick={() => selectObject(object.id)} aria-label={object.label} className={`absolute z-[45] -translate-x-1/2 -translate-y-1/2 rounded-xl p-2 text-3xl transition ${stage === "game" && !found ? "cursor-pointer hover:bg-[#ffd84d]/25" : "cursor-default"} ${found ? "opacity-20" : "drop-shadow-[0_8px_5px_rgba(0,0,0,.35)]"}`} style={{ left: `${object.x}%`, top: `${object.y}%`, transform: `translate(-50%, -50%) scale(${object.scale})` }}>{object.emoji}</button>;
            })}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[8px] font-black tracking-[.18em] text-white/45 backdrop-blur">ENTRANCE VIEW</div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] bg-[#f5f3ee] p-4 text-stone-950 shadow-[0_20px_70px_rgba(0,0,0,.45)] sm:p-5">
          {stage === "overview" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500">Welcome to OS Lab</p><h1 className="mt-1 text-2xl font-black tracking-[-.04em]">입구에서 연구실을 둘러볼까요?</h1><p className="mt-1 text-xs font-semibold text-stone-500">두 줄의 자리와 8명의 랩 멤버가 기다리고 있어요.</p></div><button type="button" onClick={startIntroductions} className="shrink-0 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-[0_5px_0_#d3aa00]">멤버 만나기 →</button></div>}
          {stage === "introductions" && <div className="flex items-center gap-4"><CharacterAvatar config={currentSpeaker?.avatarConfig ?? DEFAULT_AVATAR_CONFIG} background={currentSpeaker?.avatarBackground} name={currentSpeaker?.name} size={56} /><div className="min-w-0 flex-1"><p className="font-black">안녕하세요! 저는 {currentSpeaker?.name ?? "OS Lab 멤버"}예요 👋</p><p className="mt-1 text-xs font-semibold text-stone-500">{currentSpeaker?.role || "OS Lab에서 함께 연구하고 있어요."}</p></div><button type="button" onClick={nextIntroduction} className="shrink-0 rounded-full bg-[#ffd84d] px-5 py-3 text-xs font-black">다음 →</button></div>}
          {stage === "game" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">Find it · {foundObjects.length}/{labObjects.length}</p><h2 className="mt-1 text-xl font-black">{currentTarget?.emoji} {currentTarget?.label}을 찾아보세요!</h2><p className="mt-1 text-xs font-semibold text-stone-500">{feedback}</p></div><div className="flex gap-1.5">{labObjects.map((object) => <span key={object.id} className={`h-2.5 w-2.5 rounded-full ${foundObjects.includes(object.id) ? "bg-emerald-500" : "bg-stone-300"}`} />)}</div></div>}
          {stage === "complete" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">Lab explorer complete</p><h2 className="mt-1 text-2xl font-black">랩 탐험 완료! 🎉</h2><p className="mt-1 text-xs font-semibold text-stone-500">이제 OS Lab의 새로운 멤버예요.</p></div><button type="button" onClick={finishTour} disabled={isFinishing} className="shrink-0 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-emerald-950 shadow-[0_5px_0_#258365]">{isFinishing ? "준비 중..." : "내 미션 만들기 →"}</button></div>}
        </div>
      </div>
    </main>
  );
}
