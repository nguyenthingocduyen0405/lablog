"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutAccount, type AuthUser } from "./lib/auth";
import AppHeader from "./components/app-header";
import CharacterAvatar from "./components/character-avatar";

function OsLabLogo() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-[2.75rem] bg-[#191812] shadow-[0_18px_0_#d8b300,0_35px_80px_rgba(25,24,18,.24)] sm:h-48 sm:w-48">
      <div className="absolute inset-3 rounded-[2.15rem] border border-white/10" />
      <svg viewBox="0 0 180 180" aria-label="OS Lab microchip logo" className="relative h-36 w-36 sm:h-44 sm:w-44">
        <g stroke="#9d83ff" strokeWidth="7" strokeLinecap="round">
          <path d="M58 23v22M90 23v22M122 23v22M58 135v22M90 135v22M122 135v22" />
          <path d="M23 58h22M23 90h22M23 122h22M135 58h22M135 90h22M135 122h22" />
        </g>
        <rect x="40" y="40" width="100" height="100" rx="27" fill="#ffd84d" />
        <rect x="50" y="50" width="80" height="80" rx="20" fill="none" stroke="#191812" strokeWidth="3" opacity=".16" />
        <text x="90" y="91" textAnchor="middle" fill="#191812" fontSize="37" fontWeight="900" letterSpacing="-4">OS</text>
        <text x="90" y="113" textAnchor="middle" fill="#191812" fontSize="12" fontWeight="900" letterSpacing="4">LAB</text>
      </svg>
      <span className="absolute -right-2 top-8 h-5 w-5 rounded-full bg-emerald-400 ring-4 ring-[#191812]" />
    </div>
  );
}

function LabLogHome({ user }: { user: AuthUser }) {
  const chapterTwoCompleted = Boolean(user.chapterTwoCompletedAt);
  const features = [
    { label: "Mission", description: "연구실 미션을 선택하고 진행해요.", href: chapterTwoCompleted ? "/mission" : "/labquest?chapter=2&locked=mission", icon: "◎", locked: !chapterTwoCompleted },
    { label: "Update", description: "연구 진행 상황을 기록하고 공유해요.", href: chapterTwoCompleted ? "/update" : "/labquest?chapter=2&locked=update", icon: "✎", locked: !chapterTwoCompleted },
    { label: "Calendar", description: "랩 일정과 중요한 날짜를 확인해요.", href: "/calendar", icon: "▦", locked: false },
    { label: "Project", description: "팀 프로젝트 공간으로 이동해요.", href: "/meeting", icon: "◉", locked: false },
  ];

  return <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
    <AppHeader user={user} />
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">LABLOG HOME</p>
      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-4xl font-black tracking-[-0.055em] sm:text-6xl">{user.name}님,<br />연구실에 오신 걸 환영해요.</h1><p className="mt-4 text-base font-semibold text-stone-400">필요한 기능을 선택해 시작하세요.</p></div>
        {!chapterTwoCompleted && <Link href="/labquest?chapter=2" className="inline-flex items-center justify-between gap-6 rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-[0_7px_0_#c7a600] sm:max-w-sm"><span><small className="block text-[10px] tracking-[.16em] text-[#ffd84d]">NEXT QUEST</small>Chapter 2를 완료해 Mission과 Update를 열어 보세요.</span><b className="text-xl">→</b></Link>}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {features.map((feature) => <Link key={feature.label} href={feature.href} className={`group relative min-h-44 overflow-hidden rounded-[1.75rem] border p-6 transition hover:-translate-y-1 ${feature.locked ? "border-stone-200 bg-stone-100 text-stone-400" : "border-black/[.06] bg-white shadow-sm hover:shadow-lg"}`}>
          <div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl text-xl font-black ${feature.locked ? "bg-stone-200" : "bg-[#ffd84d] text-stone-950"}`}>{feature.icon}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest ${feature.locked ? "bg-stone-200 text-stone-500" : "bg-emerald-50 text-emerald-600"}`}>{feature.locked ? "CH.2 · LOCKED" : "OPEN"}</span></div>
          <h2 className="mt-5 text-2xl font-black">{feature.label}</h2><p className="mt-2 text-sm font-semibold leading-6 opacity-65">{feature.description}</p>
        </Link>)}
      </div>
    </section>
  </main>;
}
export default function ReadyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!cancelled) setUser(currentUser);
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  async function startOnboarding() {
    if (!user || isStarting) return;
    setIsStarting(true);
    router.push("/lab-tour");
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">OS LAB</p></main>;
  }

  if (user.onboardingCompletedAt) return <LabLogHome user={user} />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f3ee] text-[#191812]">
      <div className="pointer-events-none absolute -left-28 -top-32 h-96 w-96 rounded-full bg-[#ffd84d]/45 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 h-[30rem] w-[30rem] rounded-full bg-[#9d83ff]/25 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.035]" style={{ backgroundImage: "radial-gradient(#191812 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-stone-400">OS LAB</p>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-bold text-stone-400 sm:block">{user.name}</span>
          <Link href={`/members/${user.id}`} className="rounded-[.85rem] ring-2 ring-white shadow-sm"><CharacterAvatar config={user.avatarConfig} background={user.avatarBackground} name={user.name} size={40} /></Link>
          <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="text-xs font-bold text-stone-400 hover:text-stone-950">{"\uB85C\uADF8\uC544\uC6C3"}</button>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 pb-20 text-center">
        <OsLabLogo />
        <p className="mt-12 text-sm font-black tracking-[0.14em] text-violet-500">OS Lab{"\uC5D0 \uC628 \uAC78 \uD658\uC601\uD574"}</p>
        <h1 className="mt-4 text-6xl font-black tracking-[-0.075em] sm:text-8xl">{"\uC900\uBE44\uB410\uC5B4?"}</h1>
        <button type="button" disabled={isStarting} onClick={startOnboarding} className="group mt-10 inline-flex items-center gap-5 rounded-full bg-[#191812] py-3 pl-8 pr-3 text-lg font-black text-white shadow-[0_8px_0_#d8b300] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-60">
          {isStarting ? "\uC900\uBE44 \uC911..." : "\uB7A9 \uD22C\uC5B4 \uC2DC\uC791"}
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd84d] text-xl text-[#191812] transition group-hover:translate-x-1">{"\u2192"}</span>
        </button>
      </section>
    </main>
  );
}
