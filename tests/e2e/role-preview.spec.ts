import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePreviewLabRole } from "../../app/lib/role-preview";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("only a verified platform admin can preview another role", () => {
  expect(resolvePreviewLabRole("member", "lab-admin", false)).toBe("member");
  expect(resolvePreviewLabRole("owner", "member", false)).toBe("owner");
  expect(resolvePreviewLabRole("owner", "lab-admin", true)).toBe("admin");
  expect(resolvePreviewLabRole("owner", "member", true)).toBe("member");
  expect(resolvePreviewLabRole("owner", null, true)).toBe("owner");
});

test("role preview is session-only and never mutates memberships", () => {
  const preview = source("app/lib/role-preview.tsx");

  expect(preview).toContain("window.sessionStorage.setItem");
  expect(preview).toContain("window.sessionStorage.removeItem");
  expect(preview).toContain("checkPlatformAdmin()");
  expect(preview).not.toContain("update_lab_member_role");
  expect(preview).not.toContain('.from("lab_members").update');
});

test("the global preview toolbar explains that real permissions do not change", () => {
  const layout = source("app/layout.tsx");
  const toolbar = source("app/components/role-preview-toolbar.tsx");

  expect(layout).toContain("<RolePreviewProvider>");
  expect(layout).toContain("<RolePreviewToolbar />");
  expect(toolbar).toContain('<option value="actual">');
  expect(toolbar).toContain('<option value="lab-admin">');
  expect(toolbar).toContain('<option value="member">');
  expect(toolbar).toContain("quyền thật được giữ nguyên");
});

test("member preview hides lab management surfaces", () => {
  const labsPage = source("app/labs/page.tsx");
  const portal = source("app/labs/[slug]/page.tsx");
  const settings = source("app/labs/[slug]/settings/page.tsx");
  const quests = source("app/labs/[slug]/quests/page.tsx");

  expect(labsPage).toContain("showPlatformControls");
  expect(labsPage).toContain("previewLabRole(lab.membershipRole)");
  expect(portal).toContain("const visibleRole = previewLabRole");
  expect(settings).toContain("const visibleRole = previewLabRole");
  expect(quests).toContain("previewLabRole(lab.membershipRole)");
});
