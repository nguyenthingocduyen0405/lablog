"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CharacterAvatar from "../components/character-avatar";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";
import { DEFAULT_AVATAR_CONFIG, loadLabMembers, type LabMember } from "../lib/lab-social";

type TourStage = "overview" | "introductions" | "game" | "complete";

const seats = [
  { x: 27, y: 34 }, { x: 42, y: 34 }, { x: 57, y: 34 }, { x: 72, y: 34 },
  { x: 27, y: 68 }, { x: 42, y: 68 }, { x: 57, y: 68 }, { x: 72, y: 68 },
];

const labObjects = [
  { id: "fridge", label: "냉장고", emoji: "🧊", x: 8, y: 36, hint: "책장 옆 왼쪽 벽을 살펴보세요." },
  { id: "microwave", label: "전자레인지", emoji: "📻", x: 91, y: 35, hint: "싱크대가 있는 오른쪽 조리대 위에 있어요." },
  { id: "printer", label: "프린터", emoji: "🖨️", x: 87, y: 72, hint: "방 뒤쪽 작업 테이블을 찾아보세요." },
  { id: "extinguisher", label: "소화기", emoji: "🧯", x: 78, y: 80, hint: "프린터 가까운 바닥 쪽에 있어요." },
  { id: "whiteboard", label: "화이트보드", emoji: "📝", x: 13, y: 72, hint: "검은 책장 옆에 세워져 있어요." },
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

  function nextIntroduction() {
    const nextMemberIndex = roomMembers.findIndex((member, index) => index > speakerIndex && Boolean(member));
    if (nextMemberIndex >= 0) {
      setSpeakerIndex(nextMemberIndex);
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
    } else {
      const nextTarget = labObjects.find((object) => !nextFound.includes(object.id));
      setFeedback(`정답! 다음은 ${nextTarget?.label}을 찾아보세요.`);
    }
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
        <div><p className="text-xs font-black tracking-[0.24em] text-[#ffd84d]">OS LAB</p><p className="mt-1 text-[10px] font-bold text-white/35">INTERACTIVE LAB TOUR</p></div>
        <button type="button" onClick={finishTour} disabled={isFinishing} className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/60 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white">건너뛰기</button>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-3 pb-32 sm:px-8 sm:pb-28">
        <div className="relative h-[60vh] min-h-[31rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#d7d9d5] shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:h-[70vh]">
          <div className="absolute inset-x-0 top-0 h-[22%] bg-[linear-gradient(180deg,#f1f2ef,#d9ddd9)]">
            <div className="absolute left-[25%] top-[10%] h-[67%] w-[52%] overflow-hidden rounded-sm bg-[#b9d5d5] ring-4 ring-[#545c58] shadow-[inset_0_0_30px_rgba(90,130,130,.18)]">
              <span className="absolute bottom-0 left-1/3 top-0 w-1 bg-[#545c58]" /><span className="absolute bottom-0 right-1/3 top-0 w-1 bg-[#545c58]" />
              <span className="absolute inset-x-0 top-0 h-[45%] bg-white/65" /><span className="absolute bottom-2 right-4 text-[8px] font-black tracking-[.25em] text-[#45605c]/40">OS LAB VIEW</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[80%] origin-bottom bg-[#aaa8a1]" style={{ clipPath: "polygon(8% 0,92% 0,100% 100%,0 100%)", backgroundImage: "linear-gradient(rgba(60,60,55,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(60,60,55,.08) 1px,transparent 1px)", backgroundSize: "46px 46px" }} />
          <div className="absolute bottom-0 left-0 top-[18%] w-[9%] bg-[linear-gradient(90deg,#c8cbc7,#eef0ed)]" />
          <div className="absolute bottom-0 right-0 top-[18%] w-[9%] bg-[linear-gradient(270deg,#c8cbc7,#eef0ed)]" />

          <div className="absolute left-[3%] top-[25%] z-10 h-[35%] w-[9%] rounded-sm bg-[#252925] shadow-xl"><div className="absolute inset-x-2 top-3 h-1 bg-white/15" /><div className="absolute inset-x-2 top-1/3 h-1 bg-white/15" /><div className="absolute inset-x-2 top-2/3 h-1 bg-white/15" /><span className="absolute inset-x-0 bottom-2 text-center text-[7px] font-black text-white/30">BOOKS</span></div>
          <div className="absolute left-[3%] top-[57%] z-10 h-[24%] w-[9%] rounded-sm bg-[linear-gradient(90deg,#b9bdba,#e5e7e5)] shadow-xl"><span className="absolute inset-x-0 top-1/2 h-px bg-black/20" /></div>
          <div className="absolute right-[2%] top-[26%] z-10 h-[38%] w-[11%] bg-[#f4f4f2] shadow-xl"><div className="absolute inset-x-0 top-0 h-[18%] bg-[#d7d9d6]" /><div className="absolute left-[10%] top-[24%] h-[24%] w-[80%] rounded bg-[#242724]" /><span className="absolute bottom-3 left-3 text-[7px] font-black text-stone-400">SINK · KITCHEN</span></div>

          {seats.map((seat, index) => {
            const member = roomMembers[index];
            const isSpeaking = stage === "introductions" && index === speakerIndex && Boolean(member);
            return (
              <div key={index} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition duration-500 ${isSpeaking ? "scale-125" : "scale-100 opacity-95"}`} style={{ left: `${seat.x}%`, top: `${seat.y}%` }}>
                <div className="absolute left-1/2 top-5 h-16 w-24 -translate-x-1/2 rounded-sm bg-[#d8d9d6] shadow-[0_12px_14px_rgba(0,0,0,.24)] sm:w-28"><span className="absolute inset-x-0 bottom-0 h-[42%] bg-[#5f842f]" /><span className="absolute left-1/2 top-0 h-full w-px bg-black/10" /></div>
                <div className="absolute left-1/2 top-11 h-9 w-20 -translate-x-1/2 rounded-sm bg-[#b78a57] shadow-[0_9px_10px_rgba(0,0,0,.24)] sm:w-24"><span className="absolute -top-3 left-3 h-6 w-9 rounded-sm bg-[#232825] ring-2 ring-[#939c96]" /></div>
                <div className="relative flex flex-col items-center">
                  <span className={`mb-1 max-w-28 truncate rounded-full px-2.5 py-1 text-[9px] font-black shadow-lg backdrop-blur ${isSpeaking ? "bg-[#ffd84d] text-stone-950" : "bg-black/55 text-white"}`}>{member?.name ?? "빈 자리"}</span>
                  {member ? <div className={isSpeaking ? "lab-character-wave" : "lab-character-float"}><CharacterAvatar config={member.avatarConfig} background={member.avatarBackground} name={member.name} size={52} className="ring-2 ring-white/20" /></div> : <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[34%] border-2 border-dashed border-white/15 bg-black/10 text-white/20">+</div>}
                  <div className="mt-1 h-4 w-12 rounded-[50%] bg-black/25 blur-[2px]" />
                </div>
              </div>
            );
          })}

          {labObjects.map((object) => {
            const found = foundObjects.includes(object.id);
            return <button key={object.id} type="button" disabled={stage !== "game" || found} onClick={() => selectObject(object.id)} aria-label={object.label} className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl p-2 text-3xl transition sm:text-4xl ${stage === "game" && !found ? "cursor-pointer hover:scale-125 hover:bg-white/15" : "cursor-default"} ${found ? "scale-75 opacity-25" : "drop-shadow-[0_8px_5px_rgba(0,0,0,.35)]"}`} style={{ left: `${object.x}%`, top: `${object.y}%` }}>{object.emoji}</button>;
          })}

          <div className="pointer-events-none absolute bottom-0 left-[47%] top-[20%] z-10 w-[6%] bg-gradient-to-b from-white/5 to-white/20" />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] bg-[#f5f3ee] p-4 text-stone-950 shadow-[0_20px_70px_rgba(0,0,0,.45)] sm:p-5">
          {stage === "overview" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500">Welcome to OS Lab</p><h1 className="mt-1 text-2xl font-black tracking-[-.04em]">연구실을 함께 둘러볼까요?</h1><p className="mt-1 text-xs font-semibold text-stone-500">8개의 자리와 랩 멤버들이 기다리고 있어요.</p></div><button type="button" onClick={() => { const first = roomMembers.findIndex(Boolean); setSpeakerIndex(Math.max(0, first)); setStage("introductions"); }} className="shrink-0 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-[0_5px_0_#d3aa00]">멤버 만나기 →</button></div>}
          {stage === "introductions" && <div className="flex items-center gap-4"><CharacterAvatar config={currentSpeaker?.avatarConfig ?? DEFAULT_AVATAR_CONFIG} background={currentSpeaker?.avatarBackground} name={currentSpeaker?.name} size={56} /><div className="min-w-0 flex-1"><p className="font-black">안녕하세요! 저는 {currentSpeaker?.name ?? "OS Lab 멤버"}예요 👋</p><p className="mt-1 text-xs font-semibold text-stone-500">{currentSpeaker?.role || "OS Lab에서 함께 연구하고 있어요."}</p></div><button type="button" onClick={nextIntroduction} className="shrink-0 rounded-full bg-[#ffd84d] px-5 py-3 text-xs font-black">다음 →</button></div>}
          {stage === "game" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">Find it · {foundObjects.length}/{labObjects.length}</p><h2 className="mt-1 text-xl font-black">{currentTarget?.emoji} {currentTarget?.label}을 찾아보세요!</h2><p className="mt-1 text-xs font-semibold text-stone-500">{feedback}</p></div><div className="flex gap-1.5">{labObjects.map((object) => <span key={object.id} className={`h-2.5 w-2.5 rounded-full ${foundObjects.includes(object.id) ? "bg-emerald-500" : "bg-stone-300"}`} />)}</div></div>}
          {stage === "complete" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">Lab explorer complete</p><h2 className="mt-1 text-2xl font-black">랩 탐험 완료! 🎉</h2><p className="mt-1 text-xs font-semibold text-stone-500">이제 OS Lab의 새로운 멤버예요.</p></div><button type="button" onClick={finishTour} disabled={isFinishing} className="shrink-0 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-emerald-950 shadow-[0_5px_0_#258365]">{isFinishing ? "준비 중..." : "내 미션 만들기 →"}</button></div>}
        </div>
      </div>
    </main>
  );
}
