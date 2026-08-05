import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  labQuestHref,
  labTourHref,
  resolveLabDeepLink,
  resolveLabTourCompletionHref,
  shouldNavigateForLabSwitch,
} from "../../app/lib/lab-routing";
import { createLabSlug } from "../../app/lib/lab-slug";
import {
  buildMissionGamePayload,
  buildStarterQuest,
  missionDraftError,
  singleLanguageText,
  type MissionDraft,
} from "../../app/lib/quest-admin";
import {
  evaluateQuestAnswer,
  questCompletionStorageKey,
  resolveVisibleChapterIndex,
} from "../../app/lib/quest-gameplay";
import type { Lab } from "../../app/lib/lab-tenancy";
import {
  ADMIN_FEATURE_ACCESS_AT,
  FEATURE_UNLOCK_STAGES,
  resolveFeatureCompletion,
} from "../../app/lib/feature-access";
import {
  DEFAULT_LAB_ACCENT,
  labInitials,
  normalizeLabAccent,
} from "../../app/lib/lab-branding";
import {
  completedMissionNumbers,
  osMissionKey,
  type OsLabQuestCatalog,
} from "../../app/lib/os-lab-quest";
import { resolvePortalQuestHref } from "../../app/lib/feature-routing";

const osLab = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "os-lab",
} as Lab;
const cvLab = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "cv-labs",
} as Lab;

test("OS Lab surfaces do not render the lab switcher", () => {
  const appHeader = readFileSync(
    resolve(process.cwd(), "app/components/app-header.tsx"),
    "utf8",
  );
  const labQuest = readFileSync(
    resolve(process.cwd(), "app/labquest/generic-labquest.tsx"),
    "utf8",
  );

  expect(appHeader).not.toContain("LabSwitcher");
  expect(labQuest).not.toContain("LabSwitcher");
});

test("lab tenancy refreshes immediately when the signed-in account changes", () => {
  const tenancy = readFileSync(
    resolve(process.cwd(), "app/lib/lab-tenancy.tsx"),
    "utf8",
  );

  expect(tenancy).toContain("onAuthStateChange");
  expect(tenancy).toContain('event === "SIGNED_OUT"');
  expect(tenancy).toContain("authUserIdRef.current !== nextUserId");
  expect(tenancy).toContain("refreshEpochRef.current += 1");
  expect(tenancy).toContain("clearStoredActiveLab()");
});

test("initial auth hydration preserves the selected lab", () => {
  const tenancy = readFileSync(
    resolve(process.cwd(), "app/lib/lab-tenancy.tsx"),
    "utf8",
  );

  const initialSessionBranch = tenancy.indexOf(
    'if (event === "INITIAL_SESSION")',
  );
  const accountChangeBranch = tenancy.indexOf(
    "if (accountChanged)",
    initialSessionBranch,
  );

  expect(initialSessionBranch).toBeGreaterThan(-1);
  expect(accountChangeBranch).toBeGreaterThan(initialSessionBranch);
  expect(
    tenancy.slice(initialSessionBranch, accountChangeBranch),
  ).not.toContain("clearStoredActiveLab()");
});

test("the lab portal link uses full-width button alignment", () => {
  const labsPage = readFileSync(
    resolve(process.cwd(), "app/labs/page.tsx"),
    "utf8",
  );

  expect(labsPage).toContain(
    'className="mt-5 block w-full rounded-2xl bg-stone-950 px-5 py-3 text-center',
  );
});

test("three-level authorization is defined by the latest migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/20260803000000_role_hierarchy.sql",
    ),
    "utf8",
  );

  expect(migration).toContain("create table if not exists public.platform_admins");
  expect(migration).toContain("public.update_lab_member_role");
  expect(migration).toContain("public.remove_lab_member");
  expect(migration).toContain("invite_code <> ''");
  expect(migration).not.toContain(
    "values ('11111111-1111-4111-8111-111111111111'::uuid, new.id",
  );
});

test("an active lab deep link does not wait for the lab request", () => {
  expect(resolveLabDeepLink("os-lab", osLab, [osLab], true)).toEqual({
    action: "open",
    lab: osLab,
  });
});

test("a Lab Quest URL identifies the exact lab and preserves locked chapter context", () => {
  expect(labQuestHref("cv-labs")).toBe("/labquest?lab=cv-labs");
  expect(
    labQuestHref("cv-labs", { chapter: 2, locked: "mission" }),
  ).toBe("/labquest?lab=cv-labs&chapter=2&locked=mission");
  expect(resolveLabDeepLink("cv-labs", osLab, [osLab, cvLab], false)).toEqual({
    action: "open",
    lab: cvLab,
  });
});

test("every lab gets its own tenant-scoped Lab Tour URL", () => {
  expect(labTourHref("mc-labs")).toBe("/lab-tour?lab=mc-labs");
  expect(labTourHref("ml-lab")).toBe("/lab-tour?lab=ml-lab");
  expect(labTourHref("cv-labs")).toBe("/lab-tour?lab=cv-labs");

  const labTour = readFileSync(
    resolve(process.cwd(), "app/lab-tour/page.tsx"),
    "utf8",
  );
  expect(labTour).toContain("resolveLabDeepLink(");
  expect(labTour).toContain("switchLab(decision.lab, labTourHref(decision.lab.slug))");
  expect(labTour).toContain("{activeLab.name}");
  expect(labTour).toContain('activeLab.slug === "os-lab" ? "game" : "complete"');
  expect(labTour).not.toContain("if (currentUser.labTourCompletedAt)");

});

test("Lab Tour resets per lab and fits its controls inside the viewport", () => {
  const labTour = readFileSync(
    resolve(process.cwd(), "app/lab-tour/page.tsx"),
    "utf8",
  );

  expect(labTour).toContain("<LabTourExperience key={decision.lab.id} />");
  expect(labTour).toContain(
    "relative flex h-[100dvh] min-h-0 flex-col overflow-hidden",
  );
  expect(labTour).toContain("min-h-0 w-full max-w-7xl flex-1");
  expect(labTour).toContain("const tourMapWidth =");
  expect(labTour).toContain("clamp(10rem, calc(");
  expect(labTour).toContain("width: tourMapWidth");
  expect(labTour).toContain(
    'className="absolute inset-x-0 bottom-0 z-50',
  );
  expect(labTour).toContain("data-tour-stage={stage}");
  expect(labTour).toContain(
    'className="grid min-h-[13rem] items-center sm:min-h-[9.5rem]"',
  );
  expect(labTour).not.toContain("calc((100vh - 13rem) *");
  expect(labTour).not.toContain(
    'className="fixed inset-x-0 bottom-0 z-50',
  );
  expect(labTour).toContain("router.replace(");
  expect(labTour).toContain("resolveLabTourCompletionHref(");
});

test("completed onboarding skips LabQuest after Lab Tour", () => {
  expect(resolveLabTourCompletionHref("member-1", false, "ml-lab")).toBe(
    "/labquest?lab=ml-lab",
  );
  expect(resolveLabTourCompletionHref("member-1", true, "ml-lab")).toBe(
    "/members/member-1",
  );
});

test("language switcher and logout share one global top-right control", () => {
  const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
  expect(layout).toContain("<GlobalHeaderControls />");
  expect(layout).toContain(
    "relative min-h-screen pt-24 [&>*:first-child]:-mt-24 [&>*:first-child]:pt-24",
  );
  expect(layout.indexOf("{children}")).toBeLessThan(
    layout.indexOf("<GlobalHeaderControls />"),
  );
  const globalSwitcher = readFileSync(
    resolve(process.cwd(), "app/components/global-header-controls.tsx"),
    "utf8",
  );
  expect(globalSwitcher).toContain("absolute right-5 top-10");
  expect(globalSwitcher).toContain("<LanguageSwitcher compact />");
  expect(globalSwitcher).toContain('className="block w-24"');
  expect(globalSwitcher).toContain("logoutAccount()");
  expect(globalSwitcher).toContain("onAuthStateChange");

  for (const localPage of [
    "app/page.tsx",
    "app/login/page.tsx",
    "app/signup/page.tsx",
    "app/labs/page.tsx",
    "app/members/[id]/page.tsx",
    "app/components/app-header.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), localPage), "utf8");
    expect(source).not.toContain("<LanguageSwitcher");
    expect(source).not.toContain("components/language-switcher");
  }

  for (const signedInSurface of [
    "app/page.tsx",
    "app/labs/page.tsx",
    "app/labs/[slug]/page.tsx",
    "app/labs/[slug]/admin/page.tsx",
    "app/labs/[slug]/settings/page.tsx",
    "app/labs/[slug]/papers/page.tsx",
    "app/labs/[slug]/quests/page.tsx",
    "app/members/[id]/page.tsx",
    "app/components/app-header.tsx",
    "app/labquest/generic-labquest.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), signedInSurface), "utf8");
    expect(source).not.toContain("logoutAccount");
    expect(source).not.toContain("pr-60");
  }
});

test("member header keeps navigation centered and clear of global controls", () => {
  const memberPage = readFileSync(
    resolve(process.cwd(), "app/members/[id]/page.tsx"),
    "utf8",
  );

  expect(memberPage).toContain(
    "grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4 sm:px-8",
  );
  expect(memberPage).toContain("min-w-0 truncate text-sm font-black");
  expect(memberPage).toContain("shrink-0 text-lg font-black");
  expect(memberPage).toContain("shrink-0 items-center justify-self-end");
  expect(memberPage).not.toContain("pt-24");
  expect(memberPage).not.toContain("pr-60");
  expect(memberPage).not.toContain(
    "flex max-w-5xl items-center justify-between px-5 py-4",
  );
});

test("every lab portal hides the secondary Lab Tour and progression sections", () => {
  const portal = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/page.tsx"),
    "utf8",
  );
  expect(portal).toContain("resolvePortalQuestHref(");
  expect(portal).toContain(': "Lab Tour"');
  expect(portal).not.toContain("showTourAndProgression");
  expect(portal).not.toContain("href: labTourHref(lab.slug)");
  expect(portal).not.toContain("FEATURE_UNLOCK_STAGES");
  expect(portal).not.toContain("PROGRESSION");
  expect(portal).not.toContain('lab.slug !== "mc-labs"');
  expect(portal).toContain(
    "flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap",
  );
  expect(portal).not.toContain("pr-60");
});

test("every lab slug keeps exactly one primary onboarding route", () => {
  for (const slug of ["os-lab", "mc-labs", "ml-lab", "cv-labs", "custom-lab"]) {
    expect(resolvePortalQuestHref("member-1", false, false, slug)).toBe(
      `/lab-tour?lab=${slug}`,
    );
    expect(resolvePortalQuestHref("member-1", false, true, slug)).toBe(
      `/labquest?lab=${slug}`,
    );
    expect(resolvePortalQuestHref("member-1", true, true, slug)).toBe(
      "/members/member-1",
    );
  }
});

test("Lab Tour completion is isolated in each lab membership", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/20260808000000_per_lab_tour_progress.sql",
    ),
    "utf8",
  );
  const auth = readFileSync(resolve(process.cwd(), "app/lib/auth.ts"), "utf8");

  expect(migration).toContain("add column if not exists lab_tour_completed_at");
  expect(migration).toContain("progress.lab_id = first_mission.lab_id");
  expect(auth).toContain("lab_tour_completed_at: completedAt");
  expect(auth).toContain("lab_id: activeLabId");
});

test("the player activates the requested lab before rendering its quest", () => {
  const labQuest = readFileSync(
    resolve(process.cwd(), "app/labquest/page.tsx"),
    "utf8",
  );

  expect(labQuest).toContain("resolveLabDeepLink(");
  expect(labQuest).toContain('decision.lab.id !== activeLab.id');
  expect(labQuest).toContain('switchLab(decision.lab, "/labquest?" + query)');
});

test("activating a lab does not reload the route that is already open", () => {
  expect(
    shouldNavigateForLabSwitch(
      "http://localhost:3000/labs/ml-lab",
      "/labs/ml-lab",
    ),
  ).toBe(false);
  expect(
    shouldNavigateForLabSwitch(
      "http://localhost:3000/labs/ml-lab",
      "/labquest",
    ),
  ).toBe(true);
});

test("lab names without ASCII characters receive a valid fallback slug", () => {
  expect(createLabSlug("운영체제 연구실", "a1b2c3d4")).toBe("lab-a1b2c3d4");
  expect(createLabSlug("Phòng thí nghiệm", "unused")).toBe(
    "phong-thi-nghiem",
  );
});

test("new labs receive three localized chapters with three missions each", () => {
  const starter = buildStarterQuest();
  expect(starter.chapters).toHaveLength(3);
  expect(
    starter.chapters.every((chapter) =>
      Object.values(chapter.title_i18n).every(Boolean),
    ),
  ).toBe(true);
  expect(starter.chapters.map((chapter) => chapter.missions.length)).toEqual([
    3, 3, 3,
  ]);
  expect(
    starter.chapters.map(
      (chapter) => chapter.unlock_rule.previousChapterRequired,
    ),
  ).toEqual([false, true, true]);
  expect(starter.chapters[1].missions[0]).toMatchObject({
    mission_type: "code-output",
    content: {
      codeSnippet: 'console.log("Hello world!");',
      rewardPoints: 10,
    },
    validation: { expectedAnswer: "Hello world!" },
  });
  expect(starter.chapters.flatMap((chapter) => chapter.missions)).toHaveLength(
    9,
  );
});

test("quest editor stores one input without requiring translations", () => {
  expect(singleLanguageText("vi", "Nội dung mới")).toEqual({
    ko: "",
    vi: "Nội dung mới",
    en: "",
  });
});

const gameDraft = (overrides: Partial<MissionDraft> = {}): MissionDraft => ({
  title: { ko: "", vi: "Game thử", en: "" },
  instructions: { ko: "", vi: "Hoàn thành thử thách", en: "" },
  missionType: "quiz",
  options: ["A", "B"],
  answerIndex: 1,
  items: ["Một", "Hai"],
  pairs: [
    { left: "CPU", right: "Tiến trình" },
    { left: "RAM", right: "Bộ nhớ ảo" },
  ],
  prompt: "Nhập câu trả lời",
  expectedAnswer: "42",
  starterCode: "print(6 * 7)",
  rewardPoints: 25,
  paperId: "",
  paperTitle: "",
  paperUrl: "",
  ...overrides,
});

test("game builder serializes template-specific content safely", () => {
  expect(buildMissionGamePayload(gameDraft())).toEqual({
    content: { rewardPoints: 25, options: ["A", "B"] },
    validation: { answerIndex: 1 },
  });
  expect(
    buildMissionGamePayload(gameDraft({ missionType: "matching" })),
  ).toEqual({
    content: {
      rewardPoints: 25,
      pairs: [
        { left: "CPU", right: "Tiến trình" },
        { left: "RAM", right: "Bộ nhớ ảo" },
      ],
    },
    validation: { matching: true, pairCount: 2 },
  });
  expect(
    buildMissionGamePayload(gameDraft({ missionType: "ordering" })),
  ).toEqual({
    content: { rewardPoints: 25, items: ["Một", "Hai"] },
    validation: { correctOrder: ["Một", "Hai"] },
  });
  expect(
    buildMissionGamePayload(gameDraft({ rewardPoints: 5000 })).content
      .rewardPoints,
  ).toBe(1000);
});

test("game builder rejects incomplete template configuration", () => {
  expect(missionDraftError(gameDraft({ options: ["Một"] }))).toBe(
    "quiz-options",
  );
  expect(
    missionDraftError(
      gameDraft({ missionType: "code-output", expectedAnswer: "" }),
    ),
  ).toBe("expected-answer");
  expect(missionDraftError(gameDraft())).toBeNull();
  expect(
    buildMissionGamePayload(
      gameDraft({ options: ["A", "", "B"], answerIndex: 2 }),
    ).validation.answerIndex,
  ).toBe(1);
  expect(
    missionDraftError(gameDraft({ options: ["A", "", "B"], answerIndex: 1 })),
  ).toBe("quiz-answer");
  expect(
    missionDraftError(
      gameDraft({
        missionType: "matching",
        pairs: [
          { left: "CPU", right: "Tiến trình" },
          { left: "RAM", right: "" },
        ],
      }),
    ),
  ).toBe("matching-pairs");
  expect(
    missionDraftError(
      gameDraft({ missionType: "ordering", items: ["Một", ""] }),
    ),
  ).toBe("ordering-items");
});

test("member game validation covers quiz matching legacy ordering code and text", () => {
  expect(evaluateQuestAnswer("quiz", 1, { answerIndex: 1 })).toBe(true);
  expect(
    evaluateQuestAnswer("ordering", { "0": 0, "1": 1 }, {
      matching: true,
      pairCount: 2,
    }),
  ).toBe(true);
  expect(
    evaluateQuestAnswer("ordering", { "0": 1, "1": 0 }, {
      matching: true,
      pairCount: 2,
    }),
  ).toBe(false);
  expect(
    evaluateQuestAnswer("ordering", ["Một", "Hai"], {
      correctOrder: ["Một", "Hai"],
    }),
  ).toBe(true);
  expect(
    evaluateQuestAnswer("code-output", "42\n", { expectedAnswer: "42" }),
  ).toBe(true);
  expect(evaluateQuestAnswer("paper", "", { minLength: 1 })).toBe(false);
  expect(evaluateQuestAnswer("custom", true, {})).toBe(true);
  expect(questCompletionStorageKey("ml-lab-id", "member-id")).toBe(
    "lablog-quest-completed:ml-lab-id:member-id",
  );
});

test("generic LabQuest reveals only the requested unlocked chapter", () => {
  const chapters = [
    ["c1-m1", "c1-m2"],
    ["c2-m1", "c2-m2"],
    ["c3-m1"],
  ];
  expect(resolveVisibleChapterIndex(chapters, new Set(), 2)).toBe(0);
  expect(
    resolveVisibleChapterIndex(
      chapters,
      new Set(["c1-m1", "c1-m2"]),
      2,
    ),
  ).toBe(1);
  expect(
    resolveVisibleChapterIndex(
      chapters,
      new Set(["c1-m1", "c1-m2", "c2-m1", "c2-m2"]),
      3,
    ),
  ).toBe(2);
  expect(
    resolveVisibleChapterIndex(
      chapters,
      new Set(["c1-m1", "c1-m2", "c2-m1", "c2-m2"]),
      1,
    ),
  ).toBe(0);
  expect(resolveVisibleChapterIndex([], new Set(), 1)).toBe(-1);
});

test("quest studio exposes templates, live preview, and playable missions", () => {
  const editor = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/quests/page.tsx"),
    "utf8",
  );
  const player = readFileSync(
    resolve(process.cwd(), "app/labquest/generic-labquest.tsx"),
    "utf8",
  );

  expect(editor).toContain("GAME BUILDER");
  expect(editor).toContain("LIVE PREVIEW");
  expect(editor).toContain("aria-pressed");
  expect(editor).toContain("busy || Boolean(draftIssue)");
  expect(editor).toContain("MatchingBuilder");
  expect(editor).toContain("Nối cột");
  expect(editor).toContain("Sắp xếp thứ tự");
  expect(editor).toContain("순서 맞추기");
  expect(player).toContain("evaluateQuestAnswer");
  expect(player).toContain("window.localStorage.setItem");
  expect(player).toContain("MissionGame");
  expect(player).toContain("CHAPTER_THEMES");
  expect(player).toContain("QUEST SYSTEM");
  expect(player).toContain("QUEST PROGRESS");
  expect(player).toContain("connectPair");
  expect(player).toContain("Choose a left item");
  expect(player).toContain("visibleChapters.map");
  expect(player).toContain("resolveVisibleChapterIndex");
  expect(player).toContain("completeChapterTwo(viewerId)");
  expect(player).toContain('from("quest_mission_progress")');
  expect(player).not.toContain("{chapters.map((chapter, chapterIndex)");
  expect(player).toContain("from-[#39ffb6] to-[#4de1ff]");
  expect(player).toContain("from-amber-300 to-orange-300");
  expect(player).toContain("from-emerald-300 to-lime-300");
  expect(player).toContain("backgroundSize: \"38px 38px\"");
});

test("OS Lab quest catalog maps database progress without hiding completed games", () => {
  const osPlayer = readFileSync(
    resolve(process.cwd(), "app/labquest/page.tsx"),
    "utf8",
  );
  const chapterTwo = readFileSync(
    resolve(process.cwd(), "app/labquest/chapter-two.tsx"),
    "utf8",
  );
  const chapterThree = readFileSync(
    resolve(process.cwd(), "app/labquest/chapter-three.tsx"),
    "utf8",
  );
  const questAdmin = readFileSync(
    resolve(process.cwd(), "app/lib/quest-admin.ts"),
    "utf8",
  );
  const catalog = {
    completedKeys: new Set(["os-c1-m1", "os-c1-m3", "os-c2-m2"]),
  } as unknown as OsLabQuestCatalog;

  expect(osMissionKey(3, 4)).toBe("os-c3-m4");
  expect(completedMissionNumbers(catalog, 1)).toEqual([1, 3]);
  expect(osPlayer).toContain("loadOsLabQuestCatalog");
  expect(osPlayer).toContain("syncLegacyOsLabProgress");
  expect(osPlayer).toContain('else setScreen("map")');
  expect(osPlayer).not.toContain(
    'else if (currentUser.onboardingCompletedAt)\n            router.replace',
  );
  expect(questAdmin).toContain("specializedMission");
  expect(questAdmin).toContain('existingMission?.content.renderer === "os-lab"');
  expect(osPlayer).not.toContain("lg:pr-60");
  expect(osPlayer).not.toContain("pb-4 pt-24");
  expect(chapterTwo).not.toContain("lg:pr-60");
  expect(chapterTwo).not.toContain("pb-4 pt-24");
  expect(chapterThree).not.toContain("lg:pr-60");
});

test("lab owners can configure every feature before completing quests", () => {
  expect(resolveFeatureCompletion("owner", null)).toBe(
    ADMIN_FEATURE_ACCESS_AT,
  );
  expect(resolveFeatureCompletion("admin", null)).toBe(
    ADMIN_FEATURE_ACCESS_AT,
  );
  expect(resolveFeatureCompletion("member", null)).toBeNull();
  expect(FEATURE_UNLOCK_STAGES.flatMap((stage) => stage.features)).toEqual(
    expect.arrayContaining([
      "Calendar",
      "Update",
      "Feed",
      "Mission",
      "Team",
      "Project",
      "Meeting",
    ]),
  );
});

test("lab portal branding is normalized for every tenant", () => {
  expect(normalizeLabAccent(" #AABBCC ")).toBe("#aabbcc");
  expect(normalizeLabAccent("not-a-colour")).toBe(DEFAULT_LAB_ACCENT);
  expect(labInitials("Distributed Systems Lab")).toBe("DS");
  expect(labInitials("운영체제 연구실")).toBe("운연");
});

test("quest editor is protected for signed-out visitors", async ({ page }) => {
  await page.goto("/labs/os-lab/quests");
  await expect(page).toHaveURL(/\/login$/);
});

test("lab portal and settings are protected for signed-out visitors", async ({
  page,
}) => {
  await page.goto("/labs/os-lab");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/labs/os-lab/settings");
  await expect(page).toHaveURL(/\/login$/);
});

test("admin dashboards are protected for signed-out visitors", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/labs/os-lab/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("signup supports an optional lab invite code", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator('input[name="joinCode"]')).toBeVisible();
  await expect(page.locator('input[name="joinCode"]')).toHaveAttribute(
    "placeholder",
    "ABCD1234",
  );
});

test("login page renders without browser errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login");

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test("language selection survives a reload", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("lablog-locale", "vi"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");

  const englishButton = page.getByRole("button", { name: "EN", exact: true });
  await englishButton.click();
  await expect(englishButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Welcome back 👋" })).toBeVisible();

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Welcome back 👋" })).toBeVisible();
});

test("outer pages expose language selection and persist it after reload", async ({ page }) => {
  await page.goto("/route-without-a-local-header");

  const vietnameseButton = page.getByRole("button", {
    name: "VI",
    exact: true,
  });
  await expect(vietnameseButton).toBeVisible();
  await vietnameseButton.click();
  await expect(vietnameseButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(vietnameseButton).toHaveAttribute("aria-pressed", "true");
});

test("global utility bar preserves each page surface without extra scroll", async ({
  page,
}) => {
  await page.goto("/signup");
  const signupMain = page.locator("main");
  const signupBox = await signupMain.boundingBox();
  expect(signupBox).not.toBeNull();
  expect(Math.round(signupBox!.y)).toBe(0);
  await expect(signupMain).toHaveCSS("background-color", "rgb(24, 22, 17)");

  await page.goto("/route-without-a-local-header");
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerHeight,
    document: document.documentElement.scrollHeight,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("language selection keeps the same top-right position across pages", async ({ page }) => {
  await page.goto("/login");
  const loginPosition = await page.getByRole("group").boundingBox();
  expect(loginPosition).not.toBeNull();
  await expect(page.getByRole("button", { name: /Log out|Đăng xuất|로그아웃/ })).toHaveCount(0);

  await page.goto("/route-without-a-local-header");
  const outerPosition = await page.getByRole("group").boundingBox();
  expect(outerPosition).not.toBeNull();
  const controlsPosition = await page.getByRole("group").locator("..").boundingBox();
  const viewport = page.viewportSize();
  expect(controlsPosition).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(controlsPosition!.x).toBeGreaterThanOrEqual(0);
  expect(controlsPosition!.x + controlsPosition!.width).toBeLessThanOrEqual(
    viewport!.width,
  );

  expect(Math.round(outerPosition!.x)).toBe(Math.round(loginPosition!.x));
  expect(Math.round(outerPosition!.y)).toBe(Math.round(loginPosition!.y));
});
