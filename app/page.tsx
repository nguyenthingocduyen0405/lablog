"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutAccount, type AuthUser } from "./lib/auth";

function OsLabLogo() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-[2.75rem] bg-[#191812] shadow-[0_18px_0_#d8b300,0_35px_80px_rgba(25,24,18,.24)] sm:h-48 sm:w-48">
      <div className="absolute inset-3 rounded-[2.15rem] border border-white/10" />
      <svg viewBox="0 0 160 160" aria-label="OS Lab logo" className="relative h-32 w-32 sm:h-40 sm:w-40">
        <circle cx="80" cy="80" r="55" fill="none" stroke="#ffd84d" strokeWidth="3" strokeDasharray="5 9" />
        <circle cx="80" cy="80" r="42" fill="#ffd84d" />
        <path d="M32 80h18M110 80h18M80 32v18M80 110v18" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="80" r="5" fill="#9d83ff" />
        <circle cx="128" cy="80" r="5" fill="#9d83ff" />
        <circle cx="80" cy="32" r="5" fill="#9d83ff" />
        <circle cx="80" cy="128" r="5" fill="#9d83ff" />
        <text x="80" y="89" textAnchor="middle" fill="#191812" fontSize="31" fontWeight="900" letterSpacing="-3">OS</text>
      </svg>
      <span className="absolute -right-2 top-8 h-5 w-5 rounded-full bg-[#9d83ff] ring-4 ring-[#191812]" />
      <span className="absolute bottom-6 left-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-[#191812]" />
    </div>
  );
}

export default function ReadyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

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

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">OS LAB</p></main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f3ee] text-[#191812]">
      <div className="pointer-events-none absolute -left-28 -top-32 h-96 w-96 rounded-full bg-[#ffd84d]/45 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 h-[30rem] w-[30rem] rounded-full bg-[#9d83ff]/25 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.035]" style={{ backgroundImage: "radial-gradient(#191812 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-stone-400">OS LAB / SYSTEM ONLINE</p>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-bold text-stone-400 sm:block">{user.name}</span>
          <Link href={`/members/${user.id}`} className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-white shadow-sm" style={{ background: user.avatarBackground }}>{user.initials}</Link>
          <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="text-xs font-bold text-stone-400 hover:text-stone-950">{"\uB85C\uADF8\uC544\uC6C3"}</button>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 pb-20 text-center">
        <OsLabLogo />
        <p className="mt-12 text-sm font-black uppercase tracking-[0.28em] text-violet-500">OS lab {"\uD658\uC601"}</p>
        <h1 className="mt-4 text-6xl font-black tracking-[-0.075em] sm:text-8xl">{"\uC900\uBE44\uB410\uC5B4?"}</h1>
        <Link href="/mission" className="group mt-10 inline-flex items-center gap-5 rounded-full bg-[#191812] py-3 pl-8 pr-3 text-lg font-black text-white shadow-[0_8px_0_#d8b300] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none">
          {"\uC2DC\uC791\uD558\uAE30"}
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd84d] text-xl text-[#191812] transition group-hover:translate-x-1">{"\u2192"}</span>
        </Link>
      </section>
    </main>
  );
}
