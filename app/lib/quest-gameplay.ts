import type { QuestMissionType } from "./quest-admin";

export type QuestAnswer =
  | string
  | number
  | string[]
  | Record<string, number>
  | boolean
  | null;

const normalizedText = (value: unknown) =>
  String(value ?? "").trim().replaceAll("\r\n", "\n");

export function evaluateQuestAnswer(
  missionType: QuestMissionType,
  answer: QuestAnswer,
  validation: Record<string, unknown>,
) {
  if (missionType === "custom") return answer === true;
  if (missionType === "quiz") {
    return typeof answer === "number" && answer === validation.answerIndex;
  }
  if (missionType === "ordering") {
    if (validation.matching === true) {
      const pairCount = Number(validation.pairCount);
      if (
        !Number.isInteger(pairCount) ||
        pairCount < 2 ||
        !answer ||
        typeof answer !== "object" ||
        Array.isArray(answer)
      ) {
        return false;
      }
      return Array.from({ length: pairCount }, (_, index) => index).every(
        (index) => answer[String(index)] === index,
      );
    }
    const expected = Array.isArray(validation.correctOrder)
      ? validation.correctOrder.map(normalizedText)
      : [];
    const actual = Array.isArray(answer) ? answer.map(normalizedText) : [];
    return expected.length > 1 && expected.every((item, index) => item === actual[index]);
  }
  if (missionType === "code-output" || missionType === "code-editor") {
    return (
      normalizedText(answer) !== "" &&
      normalizedText(answer) === normalizedText(validation.expectedAnswer)
    );
  }
  const minimum =
    typeof validation.minLength === "number" ? validation.minLength : 1;
  return normalizedText(answer).length >= minimum;
}

export function questCompletionStorageKey(labId: string, userId: string) {
  return "lablog-quest-completed:" + labId + ":" + userId;
}

export function resolveRestoredQuestProgress(input: {
  authenticated: boolean;
  databaseProgressReady: boolean;
  databaseIds: readonly string[];
  storedIds: readonly string[];
  missionIds: ReadonlySet<string>;
}) {
  const candidates = input.authenticated
    ? input.databaseProgressReady
      ? input.databaseIds
      : []
    : input.storedIds;
  return Array.from(new Set(candidates)).filter((id) =>
    input.missionIds.has(id),
  );
}

export type QuestCompletionMilestone =
  | "onboarding"
  | "chapter-two"
  | "chapter-three"
  | null;

export type QuestMilestoneProgress = {
  onboardingCompletedAt: string | null;
  chapterTwoCompletedAt: string | null;
  chapterThreeCompletedAt: string | null;
};

export function resolveQuestCompletionMilestone(
  chapterIndex: number,
): QuestCompletionMilestone {
  if (chapterIndex === 0) return "onboarding";
  if (chapterIndex === 1) return "chapter-two";
  if (chapterIndex === 2) return "chapter-three";
  return null;
}

export function isQuestCompletionMilestoneSaved(
  milestone: QuestCompletionMilestone,
  progress: QuestMilestoneProgress,
) {
  if (milestone === "onboarding") {
    return Boolean(progress.onboardingCompletedAt);
  }
  if (milestone === "chapter-two") {
    return Boolean(progress.chapterTwoCompletedAt);
  }
  if (milestone === "chapter-three") {
    return Boolean(progress.chapterThreeCompletedAt);
  }
  return true;
}

export function resolveQuestCompletionDestination(
  unlockedDestination: string,
  missionIds: readonly string[],
  completedMissionIds: ReadonlySet<string>,
) {
  const questComplete =
    missionIds.length > 0 &&
    missionIds.every((missionId) => completedMissionIds.has(missionId));
  return questComplete ? unlockedDestination : null;
}

export function resolveVisibleChapterIndex(
  chapterMissionIds: string[][],
  completedMissionIds: ReadonlySet<string>,
  requestedChapter: number,
) {
  if (chapterMissionIds.length === 0) return -1;
  let highestUnlockedIndex = 0;
  for (let index = 1; index < chapterMissionIds.length; index += 1) {
    const previousMissions = chapterMissionIds[index - 1];
    const previousComplete =
      previousMissions.length > 0 &&
      previousMissions.every((missionId) => completedMissionIds.has(missionId));
    if (!previousComplete) break;
    highestUnlockedIndex = index;
  }
  const requestedIndex = Math.min(
    chapterMissionIds.length - 1,
    Math.max(0, requestedChapter - 1),
  );
  return Math.min(requestedIndex, highestUnlockedIndex);
}
