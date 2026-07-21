"use client";

import type { ReactNode } from "react";
import type { LabMember } from "../lib/lab-social";
import { LAB_SEATS, placeMembersBySeat } from "../lib/lab-map";
import CharacterAvatar from "./character-avatar";
import { useI18n } from "../lib/i18n";

type LabRoomMapProps = {
  members: LabMember[];
  currentUserId?: string;
  focusedSeat?: number | null;
  selectedSeat?: number | null;
  interactive?: boolean;
  onSeatSelect?: (seatIndex: number) => void;
  children?: ReactNode;
};

export default function LabRoomMap({
  members,
  currentUserId,
  focusedSeat = null,
  selectedSeat = null,
  interactive = false,
  onSeatSelect,
  children,
}: LabRoomMapProps) {
  const { l } = useI18n();
  const roomMembers = placeMembersBySeat(members);

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/lab-tour-room-v5.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/5" />
      {LAB_SEATS.map((seat, index) => {
        const member = roomMembers[index];
        const isCurrentUser = member?.id === currentUserId;
        const isFocused = focusedSeat === index;
        const isSelected = selectedSeat === index;
        const canSelect = interactive && (!member || isCurrentUser);
        const label =
          member?.name ??
          l(
            `빈 자리 ${index + 1}`,
            `Chỗ trống ${index + 1}`,
            `Empty seat ${index + 1}`,
          );
        return (
          <button
            key={index}
            type="button"
            disabled={!canSelect}
            onClick={() => canSelect && onSeatSelect?.(index)}
            aria-label={
              canSelect
                ? l(`${label} 선택`, `Chọn ${label}`, `Select ${label}`)
                : label
            }
            aria-pressed={isSelected}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl outline-none transition duration-300 ${canSelect ? "cursor-pointer hover:bg-[#ffd84d]/20 focus-visible:ring-4 focus-visible:ring-[#ffd84d]" : "cursor-default"} ${isSelected ? "bg-[#ffd84d]/25 ring-4 ring-[#ffd84d]" : ""}`}
            style={{
              left: `${seat.x}%`,
              top: `${seat.y}%`,
              transform: `translate(-50%, -50%) scale(${seat.scale * (isFocused ? 1.22 : 1)})`,
              zIndex: 20 + seat.depth,
            }}
          >
            <span className="relative flex flex-col items-center p-2">
              <span
                className={`mb-1 max-w-28 truncate rounded-full px-2.5 py-1 text-[9px] font-black shadow-lg backdrop-blur ${isCurrentUser || isSelected ? "bg-[#ffd84d] text-stone-950" : "bg-black/60 text-white"}`}
              >
                {isSelected && !member
                  ? l("내 자리", "Chỗ của tôi", "My seat")
                  : label}
              </span>
              {member ? (
                <span
                  className={
                    isFocused ? "lab-character-wave" : "lab-character-float"
                  }
                >
                  <CharacterAvatar
                    config={member.avatarConfig}
                    background={member.avatarBackground}
                    name={member.name}
                    size={52}
                    className="ring-2 ring-white/20"
                  />
                </span>
              ) : (
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[34%] border-2 border-dashed border-white/40 bg-black/15 text-lg font-black text-white/70">
                  {canSelect ? "+" : "·"}
                </span>
              )}
              <span className="mt-1 h-4 w-12 rounded-[50%] bg-black/25 blur-[2px]" />
            </span>
          </button>
        );
      })}
      {children}
    </div>
  );
}
