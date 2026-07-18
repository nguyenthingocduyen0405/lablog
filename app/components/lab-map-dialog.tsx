"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../lib/auth";
import { placeMembersBySeat } from "../lib/lab-map";
import { loadLabMembers, saveLabSeat, type LabMember } from "../lib/lab-social";
import LabRoomMap from "./lab-room-map";

export default function LabMapDialog({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const [members, setMembers] = useState<LabMember[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    loadLabMembers().then((loadedMembers) => {
      setMembers(loadedMembers);
      setSelectedSeat(loadedMembers.find((member) => member.id === user.id)?.labSeat ?? null);
    }).catch(() => setMessage("랩 지도를 불러오지 못했어요."));
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, user.id]);

  const savedSeat = useMemo(() => members.find((member) => member.id === user.id)?.labSeat ?? null, [members, user.id]);
  const roomMembers = useMemo(() => placeMembersBySeat(members), [members]);

  async function updateSeat() {
    if (selectedSeat === null || selectedSeat === savedSeat || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      await saveLabSeat(user.id, selectedSeat);
      setMembers((current) => current.map((member) => member.id === user.id ? { ...member, labSeat: selectedSeat } : member));
      setMessage(`${selectedSeat + 1}번 자리로 업데이트했어요.`);
    } catch (error) {
      const missingColumn = typeof error === "object" && error !== null && "code" in error && error.code === "42703";
      setMessage(missingColumn ? "데이터베이스 업데이트가 필요해요. lab_seat migration을 먼저 실행해 주세요." : "자리를 업데이트하지 못했어요. 다른 멤버가 먼저 선택했는지 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lab-map-title" onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <section onClick={(event) => event.stopPropagation()} className="w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#181611] text-white shadow-[0_30px_120px_rgba(0,0,0,.55)]">
        <header className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ffd84d]">2.5D LAB MAP</p><h2 id="lab-map-title" className="mt-1 text-2xl font-black tracking-[-.04em]">연구실 자리 배치</h2><p className="mt-1 text-xs font-semibold text-white/45">빈 자리를 눌러 내 위치를 확인하거나 변경할 수 있어요.</p></div>
          <button type="button" onClick={onClose} aria-label="랩 지도 닫기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl text-white/70 hover:bg-white/20 hover:text-white">×</button>
        </header>
        <div className="relative mx-3 aspect-[16/9] min-h-[18rem] overflow-hidden rounded-[1.4rem] bg-[#d9dcd8] sm:mx-6">
          <LabRoomMap members={members} currentUserId={user.id} selectedSeat={selectedSeat} interactive onSeatSelect={setSelectedSeat} />
        </div>
        <footer className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div><p className="text-sm font-black">{selectedSeat === null ? "내 자리를 선택해 주세요." : `${selectedSeat + 1}번 자리 ${roomMembers[selectedSeat] && roomMembers[selectedSeat]?.id !== user.id ? "· 사용 중" : "· 선택됨"}`}</p>{message && <p className="mt-1 text-xs font-bold text-[#ffd84d]">{message}</p>}</div>
          <button type="button" onClick={updateSeat} disabled={selectedSeat === null || selectedSeat === savedSeat || isSaving} className="rounded-full bg-[#ffd84d] px-6 py-3 text-sm font-black text-stone-950 disabled:cursor-not-allowed disabled:opacity-35">{isSaving ? "업데이트 중..." : "내 자리 업데이트"}</button>
        </footer>
      </section>
    </div>
  );
}
