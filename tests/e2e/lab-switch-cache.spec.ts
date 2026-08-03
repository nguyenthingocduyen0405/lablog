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
  const exposeLab = tenancy.indexOf("exposeLab(lab);", switchStart);

  expect(switchStart).toBeGreaterThan(-1);
  expect(clearCache).toBeGreaterThan(switchStart);
  expect(exposeLab).toBeGreaterThan(clearCache);
  expect(tenancy).toContain("switchEpoch !== labSwitchEpochRef.current");
});

test("creating and joining labs do not block navigation on a full lab refresh", () => {
  const tenancy = readFileSync(
    resolve(process.cwd(), "app/lib/lab-tenancy.tsx"),
    "utf8",
  );
  const createStart = tenancy.indexOf("const createLab = useCallback");
  const joinStart = tenancy.indexOf("const joinLab = useCallback");
  const updateStart = tenancy.indexOf("const updateLab = useCallback");
  const createFlow = tenancy.slice(createStart, joinStart);
  const joinFlow = tenancy.slice(joinStart, updateStart);

  expect(createFlow).toContain("exposeLab(created);");
  expect(createFlow).toContain("void refreshLabs();");
  expect(createFlow).not.toContain("await refreshLabs();");
  expect(joinFlow).toContain("exposeLab(joined);");
  expect(joinFlow).toContain("void refreshLabs();");
  expect(joinFlow).not.toContain("await refreshLabs();");
});

test("switching labs uses Next client navigation instead of reloading the page", () => {
  const tenancy = readFileSync(
    resolve(process.cwd(), "app/lib/lab-tenancy.tsx"),
    "utf8",
  );
  const switchStart = tenancy.indexOf("const switchLab = useCallback");
  const createStart = tenancy.indexOf("const createLab = useCallback");
  const switchFlow = tenancy.slice(switchStart, createStart);

  expect(switchFlow).toContain("router.push(redirectTo);");
  expect(switchFlow).not.toContain("window.location.assign");
});
