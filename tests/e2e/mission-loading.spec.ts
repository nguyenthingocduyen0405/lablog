import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email!);
  await page.locator('input[name="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

test("mission page leaves its loading-only screen after authentication", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.",
  );

  await signIn(page);
  await page.goto("/mission");
  await expect(
    page.getByRole("heading").or(page.getByRole("alert")).first(),
  ).toBeVisible({ timeout: 15_000 });
});

test("LabQuest does not expose the lab switcher", async ({ page }) => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.",
  );

  await signIn(page);
  await page.goto("/labquest");
  await expect(page.locator("select")).toHaveCount(0);
});
