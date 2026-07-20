"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../components/app-header";
import MissionPanel from "../components/mission-panel";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { loadActiveMissions, loadMissionActivity, type Mission, type MissionActivity } from "../lib/lab-social";

export default function MissionPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [posts, setPosts] = useState<MissionActivity[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      const [activeMissions, loadedPosts] = await Promise.all([
        loadActiveMissions(currentUser.id),
        loadMissionActivity(currentUser.id),
      ]);
      if (cancelled) return;
      setUser(currentUser);
      setMissions(activeMissions);
      setPosts(loadedPosts);
    }).catch(() => setMessage("Supabase \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."));
    return () => { cancelled = true; };
  }, [router]);

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">02 / Mission</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{"\uC624\uB298\uBD80\uD130 \uC5B4\uB5A4"}<br />{"\uB3C4\uC804\uC744 \uD560\uAE4C\uC694?"}</h1>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-6 text-stone-400 sm:text-right">여러 미션을 함께 진행할 수 있어요. 시작한 미션은 종료일까지 유지되며, 각 업데이트는 하나의 미션에 기록됩니다.</p>
        </div>

        <MissionPanel missions={missions} posts={posts} onMissionAdded={(mission) => setMissions((current) => current.some((item) => item.id === mission.id) ? current : [mission, ...current])} />

        {message && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{message}</p>}

        <div className="mt-8 flex items-center justify-between border-t border-black/[0.08] pt-6">
          <Link href="/" className="text-sm font-black text-stone-400 hover:text-stone-900">{"\u2190 \uC774\uC804"}</Link>
          {missions.length > 0 ? user.chapterTwoCompletedAt ? (
            <Link href="/update" className="group inline-flex items-center gap-4 rounded-full bg-stone-950 py-2.5 pl-6 pr-2.5 text-sm font-black text-white shadow-[0_7px_0_#c7a600] transition hover:-translate-y-0.5">
              {"\uC5C5\uB370\uC774\uD130 \uC2DC\uC791"}
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd84d] text-stone-950">{"\u2192"}</span>
            </Link>
          ) : (
            <Link href="/labquest?chapter=2&locked=update" className="inline-flex items-center gap-3 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-500 shadow-sm">
              <span>🔒</span><span>CHAPTER 2 완료 후 Update 오픈</span>
            </Link>
          ) : <span className="text-xs font-bold text-stone-300">{"\uBBF8\uC158\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694"}</span>}
        </div>
      </div>
    </main>
  );
}
