import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("switching labs clears tenant caches before exposing the next lab", () => {
  const tenancy = readFileSync(
    resolve(process.cwd(), "app/lib/lab-tenancy.tsx"),
    "utf8",
  );
  const switchStart = tenancy.indexOf("const switchLab = useCallback");
  const clearCache = tenancy.indexOf("clearAuthCache();", switchStart);
  const storeLab = tenancy.indexOf("storeActiveLab(lab);", switchStart);
  const exposeLab = tenancy.indexOf("setActiveLab(lab);", switchStart);

  expect(switchStart).toBeGreaterThan(-1);
  expect(clearCache).toBeGreaterThan(switchStart);
  expect(storeLab).toBeGreaterThan(clearCache);
  expect(exposeLab).toBeGreaterThan(storeLab);
  expect(tenancy).toContain("switchEpoch !== labSwitchEpochRef.current");
});
