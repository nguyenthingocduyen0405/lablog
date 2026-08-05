import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveAuthenticatedFeatureRedirect,
  resolvePortalQuestHref,
} from "../../app/lib/feature-routing";

test("unlocked ML Lab opens the member home instead of the game", () => {
  expect(resolvePortalQuestHref("ml-member-id", true, true, "ml-lab")).toBe(
    "/members/ml-member-id",
  );
  expect(resolvePortalQuestHref("ml-member-id", false, true, "ml-lab")).toBe(
    "/labquest?lab=ml-lab",
  );
  expect(resolvePortalQuestHref("ml-member-id", false, false, "ml-lab")).toBe(
    "/lab-tour?lab=ml-lab",
  );

  const portal = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/page.tsx"),
    "utf8",
  );
  expect(portal).not.toContain("resolvePortalQuestHref(");
  expect(portal).not.toContain('"Lab Tour"');
  expect(portal).not.toContain("PROGRESSION");
});

test("ML Lab owners can open Feed before completing Chapter 2", () => {
  expect(
    resolveAuthenticatedFeatureRedirect({
      path: "/update",
      userId: "ml-owner-id",
      memberPathId: null,
      role: "owner",
      labSlug: "ml-lab",
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
      labSlug: "ml-lab",
      chapterTwoCompletedAt: null,
      chapterThreeCompletedAt: null,
    }),
  ).toBe("/labquest?lab=ml-lab&chapter=2&locked=update");
});
