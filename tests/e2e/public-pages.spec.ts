import { expect, test } from "@playwright/test";

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
