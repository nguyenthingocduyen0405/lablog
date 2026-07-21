"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CharacterAvatar from "../components/character-avatar";
import LabRoomMap from "../components/lab-room-map";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { LAB_SEATS, placeMembersBySeat } from "../lib/lab-map";
import { DEFAULT_AVATAR_CONFIG, loadLabMembers, saveLabSeat, type LabMember } from "../lib/lab-social";

type TourStage = "overview" | "seat" | "introductions" | "game" | "complete";

const labObjects = [
  { id: "bookshelf", label: "책장", emoji: "📚", path: "M 165 185 L 452 214 L 460 574 L 414 609 L 205 631 L 165 616 Z", checkX: 310, checkY: 400, hint: "왼쪽 벽을 따라 길게 놓여 있어요." },
  { id: "meeting", label: "회의 테이블", emoji: "🗂️", path: "M 340 449 L 550 405 L 455 462 L 340 462 Z", checkX: 445, checkY: 441, hint: "책장 앞쪽의 긴 테이블을 찾아보세요." },
  { id: "printer", label: "프린터", emoji: "🖨️", path: "M 528 335 Q 522 337 520 345 L 519 375 Q 519 382 526 384 L 582 384 Q 589 382 590 375 L 588 344 Q 587 337 580 335 Z", checkX: 554, checkY: 360, hint: "회의 테이블 뒤쪽의 낮은 프린터 받침대 위에 있어요." },
  { id: "trash", label: "쓰레기통", emoji: "🗑️", path: "M 785 629 Q 786 614 802 611 L 850 611 Q 866 614 868 629 L 860 786 Q 858 799 844 801 L 805 801 Q 790 798 789 785 Z M 871 629 Q 873 614 889 611 L 944 611 Q 960 614 962 629 L 956 785 Q 954 799 940 801 L 892 801 Q 877 798 876 785 Z", checkX: 874, checkY: 700, hint: "첫 번째 자리보다 앞쪽에 있어요." },
  { id: "water", label: "정수기", emoji: "🚰", path: "M 972 548 Q 976 535 991 532 L 1056 532 Q 1076 535 1082 552 L 1076 815 Q 1075 827 1061 829 L 991 829 Q 976 827 974 814 Z", checkX: 1025, checkY: 680, hint: "쓰레기통과 전자레인지 사이에 있어요." },
  { id: "microwave", label: "전자레인지", emoji: "📻", path: "M 1092 537 L 1307 548 L 1301 669 L 1091 671 Z", checkX: 1198, checkY: 606, hint: "설비 줄의 오른쪽 조리대 위에 있어요." },
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
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSavingSeat, setIsSavingSeat] = useState(false);
  const [seatMessage, setSeatMessage] = useState("");

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
        setMembers(loadedMembers);
        setSelectedSeat(loadedMembers.find((member) => member.id === currentUser.id)?.labSeat ?? currentUser.labSeat);
      }
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  const roomMembers = useMemo(() => placeMembersBySeat(members), [members]);
  const currentSpeaker = roomMembers[speakerIndex];
  const currentTarget = labObjects.find((object) => !foundObjects.includes(object.id));
  const speakerSeat = LAB_SEATS[speakerIndex];
  const cameraShift = stage === "introductions" && speakerSeat ? (speakerSeat.side === "left" ? 4 : -4) : 0;

  function startIntroductions() {
    const firstMember = roomMembers.findIndex(Boolean);
    setSpeakerIndex(Math.max(0, firstMember));
    setStage("introductions");
  }

  async function confirmSeat() {
    if (!user || selectedSeat === null || isSavingSeat) return;
    setIsSavingSeat(true);
    setSeatMessage("");
    try {
      if (user.labSeat !== selectedSeat) await saveLabSeat(user.id, selectedSeat);
      setMembers((current) => current.map((member) => member.id === user.id ? { ...member, labSeat: selectedSeat } : member));
      setUser({ ...user, labSeat: selectedSeat });
      startIntroductions();
    } catch (error) {
      const missingColumn = typeof error === "object" && error !== null && "code" in error && error.code === "42703";
      setSeatMessage(missingColumn ? "데이터베이스 업데이트가 필요해요. lab_seat migration을 먼저 실행해 주세요." : "이 자리는 방금 다른 멤버가 선택했어요. 다른 빈 자리를 골라 주세요.");
      const loadedMembers = await loadLabMembers().catch(() => members);
      setMembers(loadedMembers);
    } finally {
      setIsSavingSeat(false);
    }
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
    setFeedback(`정답! 다음은 ${nextTarget?.id === "printer" ? "프린터 찾으세요!" : `${nextTarget?.label}을 찾아보세요.`}`);
  }

  async function finishTour() {
    if (!user || isFinishing) return;
    if (user.labSeat === null) {
      setStage("seat");
      setSeatMessage("랩 투어를 마치기 전에 내 자리를 선택해 주세요.");
      return;
    }
    setIsFinishing(true);
    try {
      router.push("/labquest");
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
        <div className="relative aspect-[1672/941] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#d9dcd8] shadow-[0_35px_120px_rgba(0,0,0,.55)]" style={{ width: "min(100%, calc((100vh - 13rem) * 1672 / 941))" }}>
          <div className="absolute inset-0 origin-center transition-transform duration-700 ease-out" style={{ transform: `translateX(${cameraShift}%) scale(${stage === "introductions" ? 1.035 : 1})` }}>
            <LabRoomMap members={members} currentUserId={user.id} focusedSeat={stage === "introductions" ? speakerIndex : null} selectedSeat={stage === "seat" ? selectedSeat : null} interactive={stage === "seat"} onSeatSelect={(seatIndex) => { setSelectedSeat(seatIndex); setSeatMessage(""); }}>
              <svg viewBox="0 0 1672 941" preserveAspectRatio="none" className="absolute inset-0 z-[45] h-full w-full" aria-label="랩 물건 찾기">
                {labObjects.map((object) => {
                  const found = foundObjects.includes(object.id);
                  const canSelect = stage === "game" && !found;
                  return <g key={object.id} role="button" tabIndex={canSelect ? 0 : -1} aria-label={object.label} aria-disabled={!canSelect} onClick={() => canSelect && selectObject(object.id)} onKeyDown={(event) => { if (canSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectObject(object.id); } }} className={canSelect ? "group cursor-pointer outline-none" : "pointer-events-none"}>
                    <path d={object.path} pointerEvents={canSelect ? "all" : "none"} className="fill-transparent stroke-transparent" />
                    {found && <g className="pointer-events-none"><circle cx={object.checkX} cy={object.checkY} r="28" fill="#10b981" stroke="white" strokeWidth="4" vectorEffect="non-scaling-stroke" /><text x={object.checkX} y={object.checkY} dy="0.35em" textAnchor="middle" fill="white" fontSize="36" fontWeight="900">✓</text></g>}
                  </g>;
                })}
              </svg>
            </LabRoomMap>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[8px] font-black tracking-[.18em] text-white/45 backdrop-blur">ENTRANCE VIEW</div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] bg-[#f5f3ee] p-4 text-stone-950 shadow-[0_20px_70px_rgba(0,0,0,.45)] sm:p-5">
          {stage === "overview" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500">Welcome to OS Lab</p><h1 className="mt-1 text-2xl font-black tracking-[-.04em]">입구에서 연구실을 둘러볼까요?</h1><p className="mt-1 text-xs font-semibold text-stone-500">먼저 2.5D 지도에서 내 자리를 선택한 뒤 랩 멤버들을 만나 보세요.</p></div><button type="button" onClick={() => setStage("seat")} className="shrink-0 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-[0_5px_0_#d3aa00]">내 자리 선택 →</button></div>}
          {stage === "seat" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500">Choose your position</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">지도에서 내 자리를 눌러 주세요.</h2><p className={`mt-1 text-xs font-semibold ${seatMessage ? "text-red-500" : "text-stone-500"}`}>{seatMessage || (selectedSeat === null ? "＋ 표시가 있는 빈 자리를 선택할 수 있어요." : `${selectedSeat + 1}번 자리를 선택했어요.`)}</p></div><button type="button" onClick={confirmSeat} disabled={selectedSeat === null || isSavingSeat} className="shrink-0 rounded-full bg-[#ffd84d] px-6 py-3 text-sm font-black text-stone-950 shadow-[0_5px_0_#d3aa00] disabled:cursor-not-allowed disabled:opacity-40">{isSavingSeat ? "업데이트 중..." : "자리 업데이트 →"}</button></div>}
          {stage === "introductions" && <div className="flex items-center gap-4"><CharacterAvatar config={currentSpeaker?.avatarConfig ?? DEFAULT_AVATAR_CONFIG} background={currentSpeaker?.avatarBackground} name={currentSpeaker?.name} size={56} /><div className="min-w-0 flex-1"><p className="font-black">안녕하세요! 저는 {currentSpeaker?.name ?? "OS Lab 멤버"}예요 👋</p><p className="mt-1 text-xs font-semibold text-stone-500">{currentSpeaker?.role || "OS Lab에서 함께 연구하고 있어요."}</p></div><button type="button" onClick={nextIntroduction} className="shrink-0 rounded-full bg-[#ffd84d] px-5 py-3 text-xs font-black">다음 →</button></div>}
          {stage === "game" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">Find it · {foundObjects.length}/{labObjects.length}</p><h2 className="mt-1 text-xl font-black">{currentTarget?.emoji} {currentTarget?.id === "printer" ? "프린터 찾으세요!" : `${currentTarget?.label}을 찾아보세요!`}</h2><p className="mt-1 text-xs font-semibold text-stone-500">{feedback}</p></div><div className="flex gap-1.5">{labObjects.map((object) => <span key={object.id} className={`h-2.5 w-2.5 rounded-full ${foundObjects.includes(object.id) ? "bg-emerald-500" : "bg-stone-300"}`} />)}</div></div>}
          {stage === "complete" && <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">Lab explorer complete</p><h2 className="mt-1 text-2xl font-black">랩 탐험 완료! 🎉</h2><p className="mt-1 text-xs font-semibold text-stone-500">이제 LabQuest Chapter 1을 시작해 볼까요?</p></div><button type="button" onClick={finishTour} disabled={isFinishing} className="shrink-0 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-emerald-950 shadow-[0_5px_0_#258365]">{isFinishing ? "준비 중..." : "LABQUEST 시작 →"}</button></div>}
        </div>
      </div>
    </main>
  );
}
