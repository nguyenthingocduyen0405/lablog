import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveAuthenticatedFeatureRedirect,
  resolvePortalQuestHref,
} from "../../app/lib/feature-routing";

test("unlocked ML Lab opens the member home instead of the game", () => {
  expect(resolvePortalQuestHref("ml-member-id", true)).toBe(
    "/members/ml-member-id",
  );
  expect(resolvePortalQuestHref("ml-member-id", false)).toBe("/labquest");

  const portal = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/page.tsx"),
    "utf8",
  );
  expect(portal).toContain(
    "resolvePortalQuestHref(accessUser.id, onboardingCompleted)",
  );
});

test("ML Lab owners can open Feed before completing Chapter 2", () => {
  expect(
    resolveAuthenticatedFeatureRedirect({
      path: "/update",
      userId: "ml-owner-id",
      memberPathId: null,
      role: "owner",
      chapterTwoCompletedAt: null,
      chapterThreeCompletedAt: null,
    }),
  ).toBeNull();
});

test("locked ML Lab members are still sent to the Chapter 2 game", () => {
  expect(
    resolveAuthenticatedFeatureRedirect({
      path: "/update",
      userId: "ml-member-id",
      memberPathId: null,
      role: "member",
      chapterTwoCompletedAt: null,
      chapterThreeCompletedAt: null,
    }),
  ).toBe("/labquest?chapter=2&locked=update");
});
