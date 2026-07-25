"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isPlatformAdmin,
  loadPlatformOverview,
  type PlatformOverview,
} from "../lib/admin";
import { useI18n } from "../lib/i18n";

export default function PlatformAdminPage() {
  const { l } = useI18n();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">(
    "loading",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    isPlatformAdmin()
      .then(async (allowed) => {
        if (cancelled) return;
        if (!allowed) return setAccess("denied");
        setAccess("allowed");
        const nextOverview = await loadPlatformOverview();
        if (!cancelled) setOverview(nextOverview);
      })
      .catch((caught) => {
        if (!cancelled) {
          setAccess("denied");
          setError(caught instanceof Error ? caught.message : "Could not load platform data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (access === "loading") return <Loading />;
  if (access === "denied") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5">
        <section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🔐</p>
          <h1 className="mt-4 text-2xl font-black">
            {l("플랫폼 관리자 권한이 필요합니다", "Cần quyền quản trị hệ thống", "Platform admin access required")}
          </h1>
          {error && <p role="alert" className="mt-3 text-sm font-bold text-red-600">{error}</p>}
          <Link href="/labs" className="mt-6 inline-block rounded-full bg-stone-950 px-6 py-3 font-black text-white">
            {l("내 랩으로", "Về Labs của tôi", "Back to my labs")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#181611] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-[#ffd84d]">LABLOG PLATFORM</p>
            <h1 className="mt-3 text-4xl font-black sm:text-6xl">
              {l("플랫폼 관리", "Quản trị hệ thống", "Platform administration")}
            </h1>
          </div>
          <Link href="/labs" className="self-start rounded-full bg-white/10 px-5 py-3 text-sm font-black ring-1 ring-white/10">
            {l("내 랩", "Labs của tôi", "My labs")}
          </Link>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          <Stat label={l("전체 랩", "Tổng số Lab", "Labs")} value={overview?.labs.length ?? 0} />
          <Stat label={l("계정", "Tài khoản", "Accounts")} value={overview?.accountCount ?? 0} />
          <Stat label={l("멤버십", "Lượt tham gia", "Memberships")} value={overview?.membershipCount ?? 0} />
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-6 text-stone-950">
          <h2 className="text-2xl font-black">{l("모든 랩", "Tất cả Lab", "All labs")}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(overview?.labs ?? []).map((lab) => (
              <article key={lab.id} className="rounded-2xl bg-stone-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">{lab.name}</h3>
                    <p className="mt-1 text-sm font-bold text-stone-400">/{lab.slug}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                    {lab.memberCount} {l("명", "thành viên", "members")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-stone-500">{lab.description || "—"}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="rounded-[1.7rem] bg-white/10 p-6 ring-1 ring-white/10"><p className="text-xs font-black uppercase tracking-widest text-white/40">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></article>;
}

function Loading() {
  return <main className="grid min-h-screen place-items-center bg-[#181611]"><p className="font-black tracking-[.2em] text-white/40">LABLOG ADMIN</p></main>;
}
