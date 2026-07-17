"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { id: "update", href: "/update#new-post", icon: "✎", label: "업데이트" },
  { id: "feed", href: "/update#feed", icon: "✦", label: "피드" },
  { id: "mission", href: "/mission", icon: "◎", label: "미션" },
  { id: "calendar", href: "/calendar", icon: "▦", label: "캘린더" },
  { id: "team", href: "/update#team", icon: "♟", label: "팀원" },
] as const;

export default function FloatingNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function isActive(id: (typeof navItems)[number]["id"]) {
    if (id === "calendar") return pathname === "/calendar";
    if (id === "mission") return pathname === "/mission";
    if (id === "team") return pathname.startsWith("/members/") || (pathname === "/update" && hash === "#team");
    if (id === "feed") return pathname === "/update" && hash === "#feed";
    return pathname === "/update" && hash !== "#feed" && hash !== "#team";
  }

  return (
    <nav aria-label="Main navigation" className="group fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[1.4rem] bg-[#1d1a16]/95 p-1.5 text-white shadow-[0_18px_50px_rgba(20,18,14,.28)] ring-1 ring-white/10 backdrop-blur-xl md:bottom-auto md:left-5 md:top-1/2 md:w-14 md:-translate-x-0 md:-translate-y-1/2 md:flex-col md:items-stretch md:transition-[width] md:duration-300 md:hover:w-36">
      {navItems.map((item) => {
        const active = isActive(item.id);
        return (
          <Link key={item.id} href={item.href} title={item.label} aria-current={active ? "page" : undefined} onClick={() => setHash(item.href.includes("#") ? `#${item.href.split("#")[1]}` : "")} className={`flex h-11 items-center rounded-[1rem] transition ${active ? "bg-[#ffd84d] text-stone-950 shadow-sm" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-black">{item.icon}</span>
            <span className="hidden overflow-hidden whitespace-nowrap pr-3 text-xs font-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
