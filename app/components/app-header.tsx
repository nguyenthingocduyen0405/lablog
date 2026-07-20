"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAccount, type AuthUser } from "../lib/auth";
import CharacterAvatar from "./character-avatar";
import FloatingNav from "./floating-nav";
import LabMapDialog from "./lab-map-dialog";
import NotificationsBell from "./notifications-bell";

export default function AppHeader({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f5f3ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href={user.chapterTwoCompletedAt ? "/update" : "/mission"} className="flex items-center gap-3">
          <span className="flex h-10 w-10 rotate-[-6deg] items-center justify-center rounded-[.9rem] bg-[#ffd84d] text-lg shadow-[0_5px_0_#181611]">{"\uD83D\uDCF8"}</span>
          <span className="text-lg font-black tracking-[-0.04em]">LABLOG</span>
        </Link>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsMapOpen(true)} aria-label="2.5D 랩 지도 열기" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-stone-600 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:text-stone-950"><span aria-hidden="true">🗺️</span><span className="hidden sm:inline">랩 지도</span></button>
          <NotificationsBell userId={user.id} />
          <Link href={`/members/${user.id}`} aria-label="Profile" className="rounded-[.85rem] shadow-sm ring-2 ring-white">
            <CharacterAvatar config={user.avatarConfig} background={user.avatarBackground} name={user.name} size={40} />
          </Link>
          <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="hidden rounded-full px-3 py-2 text-xs font-bold text-stone-400 hover:bg-white hover:text-stone-900 lg:block">
            {"\uB85C\uADF8\uC544\uC6C3"}
          </button>
        </div>
        </div>
      </header>
      <FloatingNav />
      {isMapOpen && <LabMapDialog user={user} onClose={() => setIsMapOpen(false)} />}
    </>
  );
}
