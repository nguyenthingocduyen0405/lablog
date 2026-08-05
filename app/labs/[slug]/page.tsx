"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, type AuthUser } from "../../lib/auth";
import { resolvePortalFeatureHref } from "../../lib/feature-routing";
import { labInitials, normalizeLabAccent } from "../../lib/lab-branding";
import { useLab } from "../../lib/lab-tenancy";
import { useI18n } from "../../lib/i18n";
import { useRolePreview } from "../../lib/role-preview";

export default function LabPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { labs, activeLab, isLoading, switchLab } = useLab();
  const { previewLabRole } = useRolePreview();
  const { l } = useI18n();
  const [accessState, setAccessState] = useState<{
    labId: string;
    user: AuthUser;
  } | null>(null);
  const lab = useMemo(
    () => labs.find((candidate) => candidate.slug === slug),
    [labs, slug],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!lab) return router.replace("/labs");
    if (activeLab.id !== lab.id) {
      switchLab(lab, "/labs/" + lab.slug);
    }
  }, [activeLab.id, isLoading, lab, router, switchLab]);

  useEffect(() => {
    if (isLoading || !lab || activeLab.id !== lab.id) {
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!cancelled) setAccessState({ labId: lab.id, user });
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [activeLab.id, isLoading, lab, router]);

  if (
    isLoading ||
    !lab ||
    activeLab.id !== lab.id ||
    accessState?.labId !== lab.id
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee]">
        <p className="text-sm font-black tracking-[.2em] text-stone-400">LABLOG</p>
      </main>
    );
  }

  const accent = normalizeLabAccent(lab.themeConfig.accent ?? "");
  const visibleRole = previewLabRole(lab.membershipRole);
  const canManage = visibleRole === "owner" || visibleRole === "admin";
  const accessUser = accessState.user;
  const chapterTwoCompleted = Boolean(accessUser.chapterTwoCompletedAt);
  const chapterThreeCompleted = Boolean(accessUser.chapterThreeCompletedAt);
  const portalLinks = [
    { href: "/labs/" + lab.slug + "/papers", icon: "📚", label: "Paper Club" },
    { href: resolvePortalFeatureHref("feed", chapterTwoCompleted, chapterThreeCompleted, lab.slug), icon: "📣", label: l("피드", "Bảng tin", "Feed") },
    { href: resolvePortalFeatureHref("mission", chapterTwoCompleted, chapterThreeCompleted, lab.slug), icon: "🎯", label: l("미션", "Nhiệm vụ", "Missions") },
    { href: "/calendar", icon: "📅", label: l("캘린더", "Lịch", "Calendar") },
    { href: resolvePortalFeatureHref("project", chapterTwoCompleted, chapterThreeCompleted, lab.slug), icon: "🤝", label: l("프로젝트", "Dự án", "Projects") },
  ];

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-8 text-stone-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap">
          <Link href="/labs" className="text-sm font-black text-stone-500">
            ← {l("랩 목록", "Danh sách lab", "All labs")}
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            {canManage && (
              <Link href={"/labs/" + lab.slug + "/admin"} className="rounded-full bg-[#ffd84d] px-4 py-2 text-sm font-black text-stone-950 shadow-sm">
                {l("랩 관리", "Quản trị Lab", "Lab admin")}
              </Link>
            )}
            {canManage && (
              <Link href={"/labs/" + lab.slug + "/settings"} className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">
                {l("포털 설정", "Cài đặt portal", "Portal settings")}
              </Link>
            )}
            {canManage && (
              <Link href={"/labs/" + lab.slug + "/quests"} className="rounded-full bg-stone-950 px-4 py-2 text-sm font-black text-white">
                {l("게임 설계", "Thiết kế game", "Design game")}
              </Link>
            )}
          </div>
        </nav>

        <section className="relative mt-7 overflow-hidden rounded-[2.5rem] bg-stone-950 p-7 text-white shadow-2xl sm:p-11">
          <div className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: accent }} />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
            {lab.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lab.logoUrl} alt={lab.name + " logo"} className="h-24 w-24 rounded-[1.8rem] bg-white object-contain p-3" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-[1.8rem] text-2xl font-black text-stone-950" style={{ backgroundColor: accent }}>
                {labInitials(lab.name)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-[.22em] text-white/40">LAB PORTAL · {visibleRole}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{lab.name}</h1>
              <p className="mt-4 max-w-2xl font-medium leading-7 text-white/60">{lab.description || l("우리 랩의 디지털 공간", "Không gian số của lab", "Your lab's digital workspace")}</p>
            </div>
            {canManage && lab.joinCode && (
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">JOIN CODE</p>
                <p className="mt-1 text-xl font-black tracking-[.2em]">{lab.joinCode}</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {portalLinks.map((item) => (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-4 rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-1 hover:shadow-lg ${item.href.startsWith("/labquest?") ? "text-stone-400" : ""}`}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl" style={{ backgroundColor: accent + "33" }}>{item.icon}</span>
              <span className="font-black">{item.label}</span>
              {item.href.startsWith("/labquest?") && <span className="text-xs font-black text-amber-600">CH. LOCK</span>}
              <span className="ml-auto text-stone-300 transition group-hover:translate-x-1">→</span>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}
