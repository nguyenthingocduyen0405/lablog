"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/app-header";
import DailyPostCard from "../components/daily-post-card";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { loadDailyPosts, loadLabMembers, type DailyPost, type LabMember } from "../lib/lab-social";

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      const [loadedMembers, loadedPosts] = await Promise.all([loadLabMembers(), loadDailyPosts()]);
      if (cancelled) return;
      setUser(currentUser);
      setMembers(loadedMembers);
      setPosts(loadedPosts);
    }).catch(() => setMessage("Supabase \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."));
    return () => { cancelled = true; };
  }, [router]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [posts],
  );

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-500">Community</p><h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{"\uC6B0\uB9AC\uC758 \uC624\uB298"}</h1></div>
          <Link href="/update" className="inline-flex w-fit items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-[0_6px_0_#ffd84d] transition hover:-translate-y-0.5">{"\uC0C8 \uC5C5\uB370\uC774\uD2B8"}<span>{"\u2192"}</span></Link>
        </div>

        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Lab members</p><h2 className="mt-1 text-2xl font-black">{"\uC6B0\uB9AC \uC5F0\uAD6C\uC2E4 \uBA64\uBC84"}</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-500 ring-1 ring-black/[0.05]">{members.length} members</span></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {members.map((member) => <Link key={member.id} href={`/members/${member.id}`} className="min-w-40 rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-black" style={{ background: member.avatarBackground }}>{member.initials}</div><p className="mt-3 font-black">{member.name}{member.id === user.id && <span className="ml-1 text-[9px] text-amber-500">ME</span>}</p><p className="mt-1 truncate text-xs font-medium text-stone-400">{member.role}</p></Link>)}
          </div>
        </section>

        <section>
          <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Fresh from the lab</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{"\uCD5C\uADFC \uAE30\uB85D"}</h2></div>
          {message && <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{message}</p>}
          {sortedPosts.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{sortedPosts.map((post) => {
            const member = members.find((item) => item.id === post.memberId);
            return member ? <DailyPostCard key={post.id} post={post} member={member} currentUserId={user.id} members={members} /> : null;
          })}</div> : <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white/50 px-6 py-16 text-center"><p className="text-5xl">{"\uD83D\uDCF7"}</p><h3 className="mt-4 text-xl font-black">{"\uC544\uC9C1 \uC5C5\uB370\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694"}</h3><Link href="/update" className="mt-5 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">{"\uCCAB \uAE30\uB85D \uC62C\uB9AC\uAE30"}</Link></div>}
        </section>
      </div>
    </main>
  );
}
