"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutAccount, type AuthUser } from "./lib/auth";

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
    return <main className="flex min-h-screen items-center justify-center bg-[#181611] text-white"><p className="text-sm font-black text-white/35">LABLOG</p></main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#181611] text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#ffd84d]/25 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#8f72ff]/25 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 rotate-[-6deg] items-center justify-center rounded-2xl bg-[#ffd84d] text-xl text-stone-950 shadow-[0_6px_0_#8f7200]">{"\uD83D\uDCF8"}</span>
          <span className="text-xl font-black tracking-[-0.04em]">LABLOG</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-bold text-white/45 sm:block">{user.name}</span>
          <Link href={`/members/${user.id}`} className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black text-stone-950 ring-2 ring-white/20" style={{ background: user.avatarBackground }}>{user.initials}</Link>
          <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="text-xs font-bold text-white/35 hover:text-white">{"\uB85C\uADF8\uC544\uC6C3"}</button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-6xl flex-col justify-center px-6 pb-16 sm:px-10">
        <p className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-[#ffd84d]">
          <span className="h-px w-10 bg-[#ffd84d]" /> Your daily challenge
        </p>
        <h1 className="max-w-4xl text-6xl font-black leading-[.92] tracking-[-0.07em] sm:text-8xl lg:text-[9rem]">
          {"\uC900\uBE44\uB410\uC5B4?"}
        </h1>
        <p className="mt-7 max-w-xl text-base font-semibold leading-7 text-white/50 sm:text-lg">
          {"\uC624\uB298\uC758 \uBAA9\uD45C\uB97C \uC120\uD0DD\uD558\uACE0, \uC791\uC740 \uC5C5\uB370\uC774\uD2B8\uB85C \uB098\uB9CC\uC758 \uC5F0\uC18D \uAE30\uB85D\uC744 \uB9CC\uB4E4\uC5B4 \uBCF4\uC138\uC694."}
        </p>

        <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
          <Link href="/mission" className="group inline-flex w-fit items-center gap-6 rounded-full bg-[#ffd84d] py-3 pl-7 pr-3 text-lg font-black text-stone-950 shadow-[0_8px_0_#8f7200] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none">
            {"\uC2DC\uC791\uD558\uAE30"}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-950 text-xl text-white transition group-hover:translate-x-1">{"\u2192"}</span>
          </Link>
          <Link href="/feed" className="w-fit text-sm font-bold text-white/40 underline-offset-4 hover:text-white hover:underline">{"\uBA3C\uC800 \uD53C\uB4DC \uBCF4\uAE30"}</Link>
        </div>

        <div className="mt-16 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/10 pt-6 text-xs font-black sm:gap-8">
          <div><span className="text-[#ffd84d]">01</span><p className="mt-2 text-white/35">READY</p></div>
          <div><span className="text-white/25">02</span><p className="mt-2 text-white/35">MISSION</p></div>
          <div><span className="text-white/25">03</span><p className="mt-2 text-white/35">UPDATE</p></div>
        </div>
      </div>
    </main>
  );
}
