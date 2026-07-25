import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePortalFeatureHref } from "../../app/lib/feature-routing";

test("MC Labs portal sends each locked feature to the correct game", () => {
  expect(resolvePortalFeatureHref("feed", false, false)).toBe(
    "/labquest?chapter=2&locked=feed",
  );
  expect(resolvePortalFeatureHref("mission", false, false)).toBe(
    "/labquest?chapter=2&locked=mission",
  );
  expect(resolvePortalFeatureHref("project", false, false)).toBe(
    "/labquest?chapter=2&locked=project",
  );
  expect(resolvePortalFeatureHref("project", true, false)).toBe(
    "/labquest?chapter=3",
  );
});

test("MC Labs portal sends unlocked features to their real pages", () => {
  expect(resolvePortalFeatureHref("feed", true, false)).toBe("/update#feed");
  expect(resolvePortalFeatureHref("mission", true, false)).toBe("/mission");
  expect(resolvePortalFeatureHref("project", true, true)).toBe("/meeting");
});

test("MC Labs access requests are isolated by active lab", () => {
  const auth = readFileSync(
    resolve(process.cwd(), "app/lib/auth.ts"),
    "utf8",
  );
  const portal = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/page.tsx"),
    "utf8",
  );

  expect(auth).toContain("currentUserRequest?.labId === activeLabId");
  expect(auth).toContain("fetchCurrentUser(activeLabId)");
  expect(portal).toContain("getCurrentUser()");
  expect(portal).toContain("CH. LOCK");
});
