"use client";

import Link from "next/link";
import { useLab } from "../lib/lab-tenancy";
import { useI18n } from "../lib/i18n";

export default function LabSwitcher() {
  const { labs, activeLab, switchLab, isLoading } = useLab();
  const { l } = useI18n();

  if (!isLoading && labs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/[0.06]">
      <select
        aria-label={l(
          "활성 랩 선택",
          "Chọn lab đang hoạt động",
          "Select active lab",
        )}
        value={activeLab.id}
        disabled={isLoading}
        onChange={(event) => {
          const nextLab = labs.find((lab) => lab.id === event.target.value);
          if (nextLab) switchLab(nextLab);
        }}
        className="max-w-28 rounded-full bg-transparent px-2 py-2 text-xs font-black outline-none sm:max-w-40"
      >
        {labs.map((lab) => (
          <option key={lab.id} value={lab.id}>
            {lab.name}
          </option>
        ))}
      </select>
      <Link
        href="/labs"
        aria-label={l("랩 관리", "Quản lý lab", "Manage labs")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-black text-stone-600 hover:bg-[#ffd84d] hover:text-stone-950"
      >
        ⚙
      </Link>
    </div>
  );
}
