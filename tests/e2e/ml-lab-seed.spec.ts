import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260804010000_seed_ml_lab.sql",
  ),
  "utf8",
);

test("ML Lab seed is idempotent and assigns the OS Lab owner", () => {
  expect(migration).toContain("'ml-lab'");
  expect(migration).toContain("'ML Lab'");
  expect(migration).toContain("os_owner_id");
  expect(migration).toContain("ml_owner_id");
  expect(migration).toContain("where slug = 'ml-lab'");
  expect(migration).toContain("if ml_lab_id is null then");
  expect(migration).toContain("respect any ownership transfer");
  expect(migration).toContain("waiting for owner assignment");
  expect(migration).toContain("return;");
  expect(migration).toContain("on conflict do nothing");
  expect(migration).toContain("on conflict (lab_id, user_id) do nothing");
  expect(migration).toContain("if not exists (");
});

test("ML Lab seed copies only Quest definitions", () => {
  expect(migration).toContain("from public.quest_chapters");
  expect(migration).toContain("from public.quest_missions");
  expect(migration).not.toMatch(/insert\s+into\s+public\.(posts|missions|team_projects|online_meetings|notifications)/i);
  expect(migration).toContain("ML Lab onboarding");
});

test("ML Lab routes are protected for signed-out visitors", async ({ page }) => {
  await page.goto("/labs/ml-lab");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/labs/ml-lab/admin");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/labs/ml-lab/quests");
  await expect(page).toHaveURL(/\/login$/);
});
