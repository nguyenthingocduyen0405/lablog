"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";

const navItems = [
  { id: "update", href: "/update#new-post", icon: "✎", label: "업데이트", unlock: "chapter2" },
  { id: "feed", href: "/update#feed", icon: "✦", label: "피드", unlock: "chapter2" },
  { id: "mission", href: "/mission", icon: "◎", label: "미션", unlock: "chapter2" },
  { id: "calendar", href: "/calendar", icon: "▦", label: "캘린더", unlock: "open" },
  { id: "meeting", href: "/meeting", icon: "◉", label: "Project", unlock: "chapter3" },
  { id: "team", href: "/update#team", icon: "♟", label: "팀원", unlock: "chapter2" },
] as const;

function NavPendingIndicator() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-current transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`} />;
}

export default function FloatingNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [chapterTwoCompleted, setChapterTwoCompleted] = useState(false);
  const [chapterThreeCompleted, setChapterThreeCompleted] = useState(false);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setChapterTwoCompleted(Boolean(user?.chapterTwoCompletedAt));
      setChapterThreeCompleted(Boolean(user?.chapterThreeCompletedAt));
    }).catch(() => {
      setChapterTwoCompleted(false);
      setChapterThreeCompleted(false);
    });
  }, [pathname]);

  function isActive(id: (typeof navItems)[number]["id"]) {
    if (id === "calendar") return pathname === "/calendar";
    if (id === "mission") return pathname === "/mission";
    if (id === "meeting") return pathname === "/meeting";
    if (id === "team") return pathname.startsWith("/members/") || (pathname === "/update" && hash === "#team");
    if (id === "feed") return pathname === "/update" && hash === "#feed";
    return pathname === "/update" && hash !== "#feed" && hash !== "#team";
  }

  return <nav aria-label="Main navigation" className="group fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[1.4rem] bg-[#1d1a16]/95 p-1.5 text-white shadow-[0_18px_50px_rgba(20,18,14,.28)] ring-1 ring-white/10 backdrop-blur-xl md:bottom-auto md:left-5 md:top-1/2 md:w-14 md:-translate-x-0 md:-translate-y-1/2 md:flex-col md:items-stretch md:transition-[width] md:duration-300 md:hover:w-40">
    {navItems.map((item) => {
      const chapterTwoLocked = item.unlock === "chapter2" && !chapterTwoCompleted;
      const projectNeedsChapterTwo = item.unlock === "chapter3" && !chapterTwoCompleted;
      const projectNeedsChapterThree = item.unlock === "chapter3" && chapterTwoCompleted && !chapterThreeCompleted;
      const locked = chapterTwoLocked || projectNeedsChapterTwo || projectNeedsChapterThree;
      const active = !locked && isActive(item.id);
      const href = projectNeedsChapterTwo ? "/labquest?chapter=2&locked=project" : projectNeedsChapterThree ? "/labquest?chapter=3" : chapterTwoLocked ? `/labquest?chapter=2&locked=${item.id}` : item.href;
      const lockedChapter = projectNeedsChapterThree ? "CH.3" : "CH.2";
      const title = projectNeedsChapterTwo ? "Project · Chapter 2 완료 후 Chapter 3 오픈" : projectNeedsChapterThree ? "Project · Chapter 3 완료 후 오픈" : chapterTwoLocked ? `${item.label} · Chapter 2 완료 후 오픈` : item.label;
      return <Link key={item.id} href={href} title={title} aria-current={active ? "page" : undefined} onClick={() => setHash(!locked && item.href.includes("#") ? `#${item.href.split("#")[1]}` : "")} className={`relative flex h-11 items-center rounded-[1rem] transition ${active ? "bg-[#ffd84d] text-stone-950 shadow-sm" : locked ? "text-white/25 hover:bg-white/[.06] hover:text-white/45" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center text-lg font-black">{item.icon}{locked && <span className="absolute right-1 top-1 text-[9px]">🔒</span>}</span>
        <span className="hidden overflow-hidden whitespace-nowrap pr-3 text-xs font-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">{item.label}{locked && <small className="ml-2 text-[9px] text-[#ffd84d]">{lockedChapter}</small>}</span>
        <NavPendingIndicator />
      </Link>;
    })}
  </nav>;
}