"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  createLabSeatPosition,
  LAB_SEATS,
  MAX_LAB_SEATS,
  MIN_LAB_SEATS,
  normalizeLabMapAspectRatio,
  type LabSeatPosition,
} from "../lib/lab-map";
import { useI18n } from "../lib/i18n";

type LabMapLayoutEditorProps = {
  imageUrl: string;
  aspectRatio: number;
  seats: LabSeatPosition[];
  disabled?: boolean;
  onAspectRatioChange: (aspectRatio: number) => void;
  onSeatsChange: (seats: LabSeatPosition[]) => void;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export default function LabMapLayoutEditor({
  imageUrl,
  aspectRatio,
  seats,
  disabled = false,
  onAspectRatioChange,
  onSeatsChange,
}: LabMapLayoutEditorProps) {
  const { l } = useI18n();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedSeat, setSelectedSeat] = useState(0);

  function updateSeat(
    index: number,
    update: Partial<LabSeatPosition>,
  ) {
    onSeatsChange(
      seats.map((seat, seatIndex) =>
        seatIndex === index ? { ...seat, ...update } : seat,
      ),
    );
  }

  function moveSeat(index: number, clientX: number, clientY: number) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const x = clamp(((clientX - bounds.left) / bounds.width) * 100, 2, 98);
    const y = clamp(((clientY - bounds.top) / bounds.height) * 100, 2, 98);
    updateSeat(index, {
      x,
      y,
      side: x < 50 ? "left" : "right",
      depth: Math.round(y),
    });
  }

  function beginDrag(index: number, event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    setSelectedSeat(index);
    event.currentTarget.setPointerCapture(event.pointerId);
    moveSeat(index, event.clientX, event.clientY);
  }

  function addSeat() {
    if (disabled || seats.length >= MAX_LAB_SEATS) return;
    const nextSeatIndex = seats.length;
    onSeatsChange([...seats, createLabSeatPosition(nextSeatIndex)]);
    setSelectedSeat(nextSeatIndex);
  }

  function removeLastSeat() {
    if (disabled || seats.length <= MIN_LAB_SEATS) return;
    onSeatsChange(seats.slice(0, -1));
    setSelectedSeat((current) =>
      Math.min(current, Math.max(0, seats.length - 2)),
    );
  }

  const activeSeat = seats[selectedSeat] ?? seats[0] ?? LAB_SEATS[0];

  return (
    <div>
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-2xl bg-stone-900 shadow-inner"
        style={{ aspectRatio: normalizeLabMapAspectRatio(aspectRatio) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              onAspectRatioChange(
                normalizeLabMapAspectRatio(
                  image.naturalWidth / image.naturalHeight,
                ),
              );
            }
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/5" />
        {seats.map((seat, index) => {
          const isSelected = selectedSeat === index;
          const seatLabel = l(
            `${index + 1}번 자리`,
            `Chỗ số ${index + 1}`,
            `Seat ${index + 1}`,
          );
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              aria-label={l(
                `${seatLabel} 위치 조정`,
                `Điều chỉnh vị trí ${seatLabel}`,
                `Adjust ${seatLabel}`,
              )}
              aria-pressed={isSelected}
              className={`absolute grid h-9 w-9 touch-none select-none place-items-center rounded-full border-2 text-xs font-black shadow-lg outline-none transition focus-visible:ring-4 focus-visible:ring-white/80 sm:h-11 sm:w-11 ${isSelected ? "border-white bg-violet-600 text-white ring-4 ring-violet-300/60" : "border-white/80 bg-stone-950/75 text-white hover:bg-violet-600"}`}
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
                transform: `translate(-50%, -50%) scale(${seat.scale})`,
                zIndex: 20 + seat.depth,
              }}
              onPointerDown={(event) => beginDrag(index, event)}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  moveSeat(index, event.clientX, event.clientY);
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 2 : 0.5;
                const offset =
                  event.key === "ArrowLeft"
                    ? { x: -step, y: 0 }
                    : event.key === "ArrowRight"
                      ? { x: step, y: 0 }
                      : event.key === "ArrowUp"
                        ? { x: 0, y: -step }
                        : event.key === "ArrowDown"
                          ? { x: 0, y: step }
                          : null;
                if (!offset) return;
                event.preventDefault();
                const x = clamp(seat.x + offset.x, 2, 98);
                const y = clamp(seat.y + offset.y, 2, 98);
                updateSeat(index, {
                  x,
                  y,
                  side: x < 50 ? "left" : "right",
                  depth: Math.round(y),
                });
              }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-white/75 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <p className="text-xs font-black text-stone-700">
              {l(
                `좌석 ${seats.length}개`,
                `${seats.length} chỗ ngồi`,
                `${seats.length} seats`,
              )}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-stone-400">
              {l(
                "좌석은 마지막 번호부터 제거됩니다.",
                "Ghế được bớt từ số cuối cùng.",
                "Seats are removed from the final number.",
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || seats.length <= MIN_LAB_SEATS}
              onClick={removeLastSeat}
              className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-35"
            >
              {l("− 좌석", "− Ghế", "− Seat")}
            </button>
            <button
              type="button"
              disabled={disabled || seats.length >= MAX_LAB_SEATS}
              onClick={addSeat}
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white disabled:opacity-35"
            >
              {l("+ 좌석", "+ Ghế", "+ Seat")}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="min-w-0 flex-1 text-xs font-black text-stone-600">
          {l(
            `자리 ${selectedSeat + 1} 크기`,
            `Kích thước chỗ ${selectedSeat + 1}`,
            `Seat ${selectedSeat + 1} size`,
          )}
          <input
            type="range"
            min="0.35"
            max="1.5"
            step="0.05"
            disabled={disabled}
            value={activeSeat.scale}
            onChange={(event) =>
              updateSeat(selectedSeat, { scale: Number(event.target.value) })
            }
            className="mt-2 w-full accent-violet-600"
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onSeatsChange(LAB_SEATS.map((seat) => ({ ...seat })));
            setSelectedSeat((current) =>
              Math.min(current, LAB_SEATS.length - 1),
            );
          }}
          className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          {l("기본 배치 복원", "Khôi phục mặc định", "Reset layout")}
        </button>
        </div>
      </div>
      <p className="mt-2 text-xs font-bold text-stone-500">
        {l(
          "번호를 드래그해 실제 좌석 위에 놓으세요. 키보드 방향키로 미세 조정할 수 있습니다.",
          "Kéo từng số vào đúng vị trí ghế. Có thể dùng phím mũi tên để căn chỉnh chính xác.",
          "Drag each number onto its seat. Use the arrow keys for precise adjustment.",
        )}
      </p>
      <p className="mt-1 text-[10px] font-bold text-amber-700">
        {l(
          "사용 중인 마지막 좌석을 제거하면 해당 멤버는 자리를 다시 선택해야 합니다.",
          "Nếu bớt ghế cuối đang có người sử dụng, thành viên đó cần chọn lại chỗ.",
          "If the removed final seat is occupied, that member must choose a seat again.",
        )}
      </p>
    </div>
  );
}
