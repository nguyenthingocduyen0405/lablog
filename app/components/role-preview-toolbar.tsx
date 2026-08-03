"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "../lib/i18n";
import { useLab } from "../lib/lab-tenancy";
import {
  useRolePreview,
  type RolePreviewMode,
} from "../lib/role-preview";

export default function RolePreviewToolbar() {
  const router = useRouter();
  const { l } = useI18n();
  const { activeLab, isLoading } = useLab();
  const { isPlatformAdmin, previewRole, setPreviewRole } = useRolePreview();

  if (!isPlatformAdmin) return null;

  function changePreview(value: string) {
    if (isLoading) return;
    const nextRole =
      value === "lab-admin" || value === "member"
        ? (value as RolePreviewMode)
        : null;
    setPreviewRole(nextRole);
    if (nextRole) router.push("/labs/" + activeLab.slug);
  }

  return (
    <aside
      aria-label={l("역할 미리보기", "Xem thử vai trò", "Role preview")}
      className={`fixed bottom-20 right-3 z-[70] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl md:bottom-4 md:right-4 ${
        previewRole
          ? "border-violet-300 bg-violet-950/95 text-white"
          : "border-black/10 bg-white/95 text-stone-950"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.18em] opacity-55">
            {l("역할 미리보기", "Xem với vai trò", "View as role")}
          </p>
          {previewRole && (
            <p className="mt-1 text-xs font-bold text-violet-200">
              {l(
                "UI만 변경되며 실제 권한은 유지됩니다.",
                "Chỉ thay đổi giao diện; quyền thật được giữ nguyên.",
                "UI preview only; real permissions stay unchanged.",
              )}
            </p>
          )}
        </div>
        <select
          aria-label={l("미리보기 역할", "Vai trò xem thử", "Preview role")}
          disabled={isLoading}
          value={previewRole ?? "actual"}
          onChange={(event) => changePreview(event.target.value)}
          className={`rounded-xl px-3 py-2 text-xs font-black outline-none disabled:opacity-40 ${
            previewRole
              ? "bg-white text-stone-950"
              : "bg-stone-100 text-stone-950"
          }`}
        >
          <option value="actual">
            {l("실제 권한", "Quyền thực", "Actual access")}
          </option>
          <option value="lab-admin">Lab Admin</option>
          <option value="member">
            {l("멤버", "Thành viên", "Member")}
          </option>
        </select>
      </div>
    </aside>
  );
}
