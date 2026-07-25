import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("floating navigation uses resolved access on its first render", () => {
  const navigation = readFileSync(
    resolve(process.cwd(), "app/components/floating-nav.tsx"),
    "utf8",
  );
  const appHeader = readFileSync(
    resolve(process.cwd(), "app/components/app-header.tsx"),
    "utf8",
  );
  const memberPage = readFileSync(
    resolve(process.cwd(), "app/members/[id]/page.tsx"),
    "utf8",
  );

  expect(navigation).toContain(
    'Pick<AuthUser, "chapterTwoCompletedAt" | "chapterThreeCompletedAt">',
  );
  expect(navigation).toContain(
    "const chapterTwoCompleted = Boolean(user.chapterTwoCompletedAt)",
  );
  expect(navigation).not.toContain("getCurrentUser");
  expect(navigation).not.toContain("setChapterTwoCompleted");
  expect(appHeader).toContain("<FloatingNav user={user} />");
  expect(memberPage).toContain("<FloatingNav user={currentUser} />");
});
