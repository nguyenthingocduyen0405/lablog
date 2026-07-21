import type { LabMember } from "./lab-social";

export const LAB_SEATS = [
  { side: "left", x: 42, y: 38, scale: 0.5, depth: 1 },
  { side: "right", x: 59, y: 38, scale: 0.5, depth: 1 },
  { side: "left", x: 41, y: 43, scale: 0.62, depth: 2 },
  { side: "right", x: 60, y: 43, scale: 0.62, depth: 2 },
  { side: "left", x: 39, y: 49, scale: 0.74, depth: 3 },
  { side: "right", x: 62, y: 49, scale: 0.74, depth: 3 },
  { side: "left", x: 38, y: 55, scale: 0.88, depth: 4 },
  { side: "right", x: 64, y: 55, scale: 0.88, depth: 4 },
] as const;

export function placeMembersBySeat(members: LabMember[]) {
  const roomMembers: Array<LabMember | null> = Array.from(
    { length: LAB_SEATS.length },
    () => null,
  );
  members.forEach((member) => {
    if (
      member.labSeat !== null &&
      member.labSeat >= 0 &&
      member.labSeat < LAB_SEATS.length
    ) {
      roomMembers[member.labSeat] = member;
    }
  });
  return roomMembers;
}
