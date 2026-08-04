import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Lab Admin access is scoped by lab membership", () => {
  const migration = source(
    "supabase/migrations/20260809000000_lab_admin_scope.sql",
  );

  expect(migration).toContain("lab_id = target_lab_id");
  expect(migration).toContain("user_id = target_user_id");
  expect(migration).toContain("membership_role in ('owner', 'admin')");
  expect(migration).toContain("public.is_platform_admin(target_user_id)");
});

test("platform admins and lab owners can appoint a Lab Admin", () => {
  const adminPage = source("app/labs/[slug]/admin/page.tsx");
  const roleMigration = source(
    "supabase/migrations/20260803000000_role_hierarchy.sql",
  );

  expect(adminPage).toContain("isPlatformAdmin()");
  expect(adminPage).toContain(
    'lab?.membershipRole === "owner" || platformAdmin',
  );
  expect(adminPage).toContain('<option value="admin">');
  expect(adminPage).toContain('<option value="admin">');
  expect(roleMigration).toContain("public.update_lab_member_role");
  expect(roleMigration).toContain("target_role not in ('admin', 'member')");
});

test("member rows show the selected lab instead of the global profile affiliation", () => {
  const adminPage = source("app/labs/[slug]/admin/page.tsx");
  const adminData = source("app/lib/admin.ts");

  expect(adminPage).toContain("{lab.name}</p>");
  expect(adminPage).not.toContain("member.profileRole");
  expect(adminData).toContain('.select("id,name")');
  expect(adminData).not.toContain("profileRole:");
});

test("Lab Admins can update the assigned lab map and design Quests", () => {
  const settingsPage = source("app/labs/[slug]/settings/page.tsx");
  const questPage = source("app/labs/[slug]/quests/page.tsx");

  expect(settingsPage).toContain("previewLabRole(lab.membershipRole)");
  expect(settingsPage).toContain("mapImageUrl");
  expect(settingsPage).toContain("await updateLab(lab.id");
  expect(questPage).toContain(
    '["owner", "admin"].includes(previewLabRole(lab.membershipRole))',
  );
});

test("regular members do not receive lab management controls", () => {
  const labsPage = source("app/labs/page.tsx");

  expect(labsPage).toContain('previewLabRole(lab.membershipRole) === "owner"');
  expect(labsPage).toContain('previewLabRole(lab.membershipRole) === "admin"');
  expect(labsPage).toContain('href={"/labs/" + lab.slug + "/settings"}');
  expect(labsPage).toContain('href={"/labs/" + lab.slug + "/quests"}');
});
