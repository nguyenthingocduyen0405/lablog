import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isQuestCompletionMilestoneSaved,
  resolveQuestCompletionDestination,
  resolveQuestCompletionMilestone,
  resolveRestoredQuestProgress,
} from "../../app/lib/quest-gameplay";

test("finishing a single-chapter tenant quest opens the member home", () => {
  expect(resolveQuestCompletionMilestone(0)).toBe("onboarding");
  expect(
    resolveQuestCompletionDestination(
      "/members/ml-member-id",
      ["mission-1", "mission-2"],
      new Set(["mission-1", "mission-2"]),
    ),
  ).toBe("/members/ml-member-id");
});

test("finishing the visible MC Labs chapter opens home before later chapters", () => {
  expect(
    resolveQuestCompletionDestination(
      "/members/mc-member-id",
      ["chapter-1-mission-1", "chapter-1-mission-2"],
      new Set(["chapter-1-mission-1", "chapter-1-mission-2"]),
    ),
  ).toBe("/members/mc-member-id");
});

test("an incomplete tenant quest remains on the game screen", () => {
  expect(
    resolveQuestCompletionDestination(
      "/members/ml-member-id",
      ["mission-1", "mission-2"],
      new Set(["mission-1"]),
    ),
  ).toBeNull();
});

test("restored completion retries only a missing feature milestone", () => {
  const progress = {
    onboardingCompletedAt: "2026-07-24T00:00:00.000Z",
    chapterTwoCompletedAt: null,
    chapterThreeCompletedAt: null,
  };

  expect(isQuestCompletionMilestoneSaved("onboarding", progress)).toBe(true);
  expect(isQuestCompletionMilestoneSaved("chapter-two", progress)).toBe(false);
  expect(isQuestCompletionMilestoneSaved("chapter-three", progress)).toBe(false);
});

test("authenticated restore ignores local-only completion", () => {
  expect(
    resolveRestoredQuestProgress({
      authenticated: true,
      databaseProgressReady: true,
      databaseIds: ["mission-1"],
      storedIds: ["mission-1", "mission-2"],
      missionIds: new Set(["mission-1", "mission-2"]),
    }),
  ).toEqual(["mission-1"]);
  expect(
    resolveRestoredQuestProgress({
      authenticated: true,
      databaseProgressReady: false,
      databaseIds: [],
      storedIds: ["mission-1", "mission-2"],
      missionIds: new Set(["mission-1", "mission-2"]),
    }),
  ).toEqual([]);
});

test("tenant quest completion saves onboarding before navigating home", () => {
  const player = readFileSync(
    resolve(process.cwd(), "app/labquest/generic-labquest.tsx"),
    "utf8",
  );

  expect(player).toContain('milestone === "onboarding"');
  expect(player).toContain("await completeOnboarding(viewerId)");
  expect(player).toContain("!isQuestCompletionMilestoneSaved(milestone, userResult)");
  expect(player).toContain("await persistQuestCompletionMilestone(");
  expect(player).toContain("resolveRestoredQuestProgress({");
  expect(player).toContain("chapterMissions.map((item) => item.id)");
  expect(player).toContain("router.replace(completionDestination)");
  expect(player).toContain("router.replace(restoredCompletionDestination)");
});

test("mission completion is committed locally only after its database write", () => {
  const player = readFileSync(
    resolve(process.cwd(), "app/labquest/generic-labquest.tsx"),
    "utf8",
  );
  const writeStart = player.indexOf("const progressResult = await supabase");
  const writeFailure = player.indexOf("if (progressResult.error)", writeStart);
  const localCommit = player.indexOf("setCompleted(next)", writeFailure);

  expect(writeStart).toBeGreaterThan(-1);
  expect(writeFailure).toBeGreaterThan(writeStart);
  expect(localCommit).toBeGreaterThan(writeFailure);
  expect(player).toContain("completed.includes(missionId) || savingMissionId");
  expect(player).toContain("disabled={completed || saving}");
  expect(player).toContain("onComplete: () => Promise<boolean>");
  expect(player).toContain("const saved = await onComplete()");
  expect(player).toContain('setFeedback(saved ? "correct" : "")');
});
