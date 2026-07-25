import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("an authenticated member can click a selectable lab seat", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.");

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email!);
  await page.locator('input[name="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/login");

  await page.goto("/lab-tour?lab=os-lab");
  await page
    .getByRole("button", { name: /내 자리 선택|Chọn chỗ của tôi|Choose my seat/ })
    .click();

  const selectableSeat = page
    .locator('button[aria-label*="선택"]:not([disabled]), button[aria-label*="Chọn"]:not([disabled]), button[aria-label*="Select"]:not([disabled])')
    .first();
  await expect(selectableSeat).toBeVisible();
  await expect(selectableSeat).toBeEnabled();
  await selectableSeat.click();
  await expect(selectableSeat).toHaveAttribute("aria-pressed", "true");

  expect(pageErrors).toEqual([]);
});
