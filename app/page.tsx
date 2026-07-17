"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeOnboarding, getCurrentUser, logoutAccount, type AuthUser } from "./lib/auth";
import { loadActiveMission } from "./lib/lab-social";
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

export default function ReadyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (currentUser.onboardingCompletedAt) {
        const mission = await loadActiveMission(currentUser.id);
        if (!cancelled) router.replace(mission ? "/update" : "/mission");
        return;
      }
      if (!cancelled) setUser(currentUser);
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  async function startOnboarding() {
    if (!user || isStarting) return;
    setIsStarting(true);
    try {
      await completeOnboarding(user.id);
      router.push("/mission");
    } finally {
      setIsStarting(false);
    }
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">OS LAB</p></main>;
  }

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
          {isStarting ? "\uC900\uBE44 \uC911..." : "\uC2DC\uC791\uD558\uAE30"}
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd84d] text-xl text-[#191812] transition group-hover:translate-x-1">{"\u2192"}</span>
        </button>
      </section>
    </main>
  );
}
