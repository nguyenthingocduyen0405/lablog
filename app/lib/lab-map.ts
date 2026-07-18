import type { LabMember } from "./lab-social";

export const LAB_SEATS = [
  { side: "left", x: 43, y: 31, scale: 0.56, depth: 1 },
  { side: "right", x: 58, y: 31, scale: 0.56, depth: 1 },
  { side: "left", x: 41, y: 39, scale: 0.66, depth: 2 },
  { side: "right", x: 60, y: 39, scale: 0.66, depth: 2 },
  { side: "left", x: 38, y: 47, scale: 0.76, depth: 3 },
  { side: "right", x: 62, y: 47, scale: 0.76, depth: 3 },
  { side: "left", x: 36, y: 56, scale: 0.88, depth: 4 },
  { side: "right", x: 65, y: 56, scale: 0.88, depth: 4 },
] as const;

export function placeMembersBySeat(members: LabMember[]) {
  const roomMembers: Array<LabMember | null> = Array.from({ length: LAB_SEATS.length }, () => null);
  members.forEach((member) => {
    if (member.labSeat !== null && member.labSeat >= 0 && member.labSeat < LAB_SEATS.length) {
      roomMembers[member.labSeat] = member;
    }
  });
  return roomMembers;
}
