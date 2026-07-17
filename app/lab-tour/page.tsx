"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CharacterAvatar from "../components/character-avatar";
import { completeOnboarding, getCurrentUser, type AuthUser } from "../lib/auth";
import { DEFAULT_AVATAR_CONFIG, loadLabMembers, type LabMember } from "../lib/lab-social";

type TourStage = "overview" | "introductions" | "game" | "complete";

const seats = [
  { x: 17, y: 30 }, { x: 39, y: 24 }, { x: 61, y: 24 }, { x: 83, y: 30 },
  { x: 17, y: 69 }, { x: 39, y: 75 }, { x: 61, y: 75 }, { x: 83, y: 69 },
];

const labObjects = [
  { id: "printer", label: "프린터", emoji: "🖨️", x: 9, y: 48, hint: "출입문 가까이에 있어요." },
  { id: "extinguisher", label: "소화기", emoji: "🧯", x: 91, y: 47, hint: "오른쪽 벽을 살펴보세요." },
  { id: "fridge", label: "냉장고", emoji: "🧊", x: 85, y: 13, hint: "방의 오른쪽 위에 있어요." },
  { id: "coffee", label: "커피 머신", emoji: "☕", x: 14, y: 14, hint: "창가 쪽 작은 테이블을 찾아보세요." },
  { id: "meeting", label: "회의 테이블", emoji: "🗂️", x: 50, y: 49, hint: "방 한가운데를 확인해 보세요." },
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
        <div className="relative h-[60vh] min-h-[31rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#293126] shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:h-[70vh]">
          <div className="absolute inset-x-0 top-0 h-[22%] bg-[linear-gradient(180deg,#343e31,#273024)]">
            <div className="absolute left-[24%] top-[18%] h-[48%] w-[52%] rounded-xl bg-[#b8d7dc]/25 ring-4 ring-[#181d17] shadow-[inset_0_0_30px_rgba(190,230,235,.16)]"><span className="absolute inset-x-0 bottom-2 text-center text-[9px] font-black tracking-[.3em] text-white/20">OS LAB</span></div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[80%] origin-bottom bg-[#c9b88d]" style={{ clipPath: "polygon(8% 0,92% 0,100% 100%,0 100%)", backgroundImage: "linear-gradient(rgba(70,55,28,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(70,55,28,.10) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
          <div className="absolute bottom-0 left-0 top-[18%] w-[9%] bg-[linear-gradient(90deg,#1c221b,#394235)]" />
          <div className="absolute bottom-0 right-0 top-[18%] w-[9%] bg-[linear-gradient(270deg,#1c221b,#394235)]" />

          {seats.map((seat, index) => {
            const member = roomMembers[index];
            const isSpeaking = stage === "introductions" && index === speakerIndex && Boolean(member);
            return (
              <div key={index} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition duration-500 ${isSpeaking ? "scale-125" : "scale-100 opacity-95"}`} style={{ left: `${seat.x}%`, top: `${seat.y}%` }}>
                <div className="absolute left-1/2 top-8 h-10 w-20 -translate-x-1/2 rotate-3 rounded-lg bg-[#695239] shadow-[0_10px_10px_rgba(0,0,0,.28)] sm:h-12 sm:w-24"><span className="absolute -top-2 left-3 h-5 w-8 rounded-sm bg-[#18221e] ring-2 ring-[#7f8e83]" /></div>
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

          <div className="absolute bottom-[8%] left-1/2 z-10 h-[18%] w-[28%] -translate-x-1/2 rounded-[50%] bg-[#746044] shadow-[0_18px_25px_rgba(0,0,0,.28)]"><span className="absolute inset-[12%] rounded-[50%] border border-white/10" /></div>
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
