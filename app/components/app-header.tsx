"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAccount, type AuthUser } from "../lib/auth";
import NotificationsBell from "./notifications-bell";

const navItems = [
  { href: "/", label: "Ready" },
  { href: "/mission", label: "Mission" },
  { href: "/update", label: "Update" },
  { href: "/feed", label: "Feed" },
];

export default function AppHeader({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f5f3ee]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 rotate-[-6deg] items-center justify-center rounded-[.9rem] bg-[#ffd84d] text-lg shadow-[0_5px_0_#181611]">{"\uD83D\uDCF8"}</span>
          <span className="text-lg font-black tracking-[-0.04em]">LABLOG</span>
        </Link>

        <nav className="order-3 flex w-full items-center justify-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/[0.05] sm:order-2 sm:w-auto">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`rounded-full px-3 py-2 text-xs font-black transition sm:px-4 ${active ? "bg-stone-950 text-white" : "text-stone-400 hover:bg-stone-100 hover:text-stone-900"}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 flex items-center gap-2 sm:order-3">
          <NotificationsBell userId={user.id} />
          <Link href={`/members/${user.id}`} aria-label="Profile" className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black text-stone-950 shadow-sm ring-2 ring-white" style={{ background: user.avatarBackground }}>
            {user.initials}
          </Link>
          <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="hidden rounded-full px-3 py-2 text-xs font-bold text-stone-400 hover:bg-white hover:text-stone-900 lg:block">
            {"\uB85C\uADF8\uC544\uC6C3"}
          </button>
        </div>
      </div>
    </header>
  );
}
