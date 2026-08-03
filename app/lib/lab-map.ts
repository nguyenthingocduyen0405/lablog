import type { LabMember } from "./lab-social";

export type LabSeatPosition = {
  side: "left" | "right";
  x: number;
  y: number;
  scale: number;
  depth: number;
};

export const DEFAULT_LAB_MAP_ASPECT_RATIO = 1672 / 941;
export const MIN_LAB_SEATS = 1;
export const MAX_LAB_SEATS = 100;

export const LAB_SEATS: readonly LabSeatPosition[] = [
  { side: "left", x: 42, y: 38, scale: 0.5, depth: 1 },
  { side: "right", x: 59, y: 38, scale: 0.5, depth: 1 },
  { side: "left", x: 41, y: 43, scale: 0.62, depth: 2 },
  { side: "right", x: 60, y: 43, scale: 0.62, depth: 2 },
  { side: "left", x: 39, y: 49, scale: 0.74, depth: 3 },
  { side: "right", x: 62, y: 49, scale: 0.74, depth: 3 },
  { side: "left", x: 38, y: 55, scale: 0.88, depth: 4 },
  { side: "right", x: 64, y: 55, scale: 0.88, depth: 4 },
] as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function createLabSeatPosition(index: number): LabSeatPosition {
  const defaultSeat = LAB_SEATS[index];
  if (defaultSeat) return { ...defaultSeat };
  const x = clamp(12 + (index % 8) * 11, 2, 98);
  const y = clamp(22 + Math.floor(index / 8) * 6, 2, 98);
  return {
    side: x < 50 ? "left" : "right",
    x,
    y,
    scale: 0.7,
    depth: Math.round(y),
  };
}

export function normalizeLabMapAspectRatio(value: unknown) {
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio >= 0.5 && ratio <= 3
    ? ratio
    : DEFAULT_LAB_MAP_ASPECT_RATIO;
}

export function normalizeLabSeatLayout(value: unknown): LabSeatPosition[] {
  if (
    !Array.isArray(value) ||
    value.length < MIN_LAB_SEATS ||
    value.length > MAX_LAB_SEATS
  ) {
    return LAB_SEATS.map((seat) => ({ ...seat }));
  }

  return value.map((candidate, index) => {
    const fallback = createLabSeatPosition(index);
    if (!candidate || typeof candidate !== "object") return { ...fallback };
    const seat = candidate as Record<string, unknown>;
    const x = Number(seat.x);
    const y = Number(seat.y);
    const scale = Number(seat.scale);
    const depth = Number(seat.depth);
    const normalizedX = Number.isFinite(x) ? clamp(x, 2, 98) : fallback.x;

    return {
      side:
        seat.side === "left" || seat.side === "right"
          ? seat.side
          : normalizedX < 50
            ? "left"
            : "right",
      x: normalizedX,
      y: Number.isFinite(y) ? clamp(y, 2, 98) : fallback.y,
      scale: Number.isFinite(scale)
        ? clamp(scale, 0.35, 1.5)
        : fallback.scale,
      depth: Number.isFinite(depth)
        ? Math.round(clamp(depth, 1, 99))
        : fallback.depth,
    };
  });
}

export function placeMembersBySeat(
  members: LabMember[],
  seatCount = LAB_SEATS.length,
) {
  const roomMembers: Array<LabMember | null> = Array.from(
    { length: seatCount },
    () => null,
  );
  members.forEach((member) => {
    if (
      member.labSeat !== null &&
      member.labSeat >= 0 &&
      member.labSeat < seatCount
    ) {
      roomMembers[member.labSeat] = member;
    }
  });
  return roomMembers;
}
