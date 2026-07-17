"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DailyPostCard from "../../components/daily-post-card";
import NotificationsBell from "../../components/notifications-bell";
import { getCurrentUser, logoutAccount, type AuthUser } from "../../lib/auth";
import {
  calculateCurrentStreak,
  loadDailyPosts,
  loadLabMembers,
  type DailyPost,
  type LabMember,
} from "../../lib/lab-social";

export default function MemberProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [localPosts, setLocalPosts] = useState<DailyPost[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const member = members.find((item) => item.id === id);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const [loadedMembers, loadedPosts] = await Promise.all([loadLabMembers(), loadDailyPosts()]);
      if (cancelled) return;
      setCurrentUser(user);
      setMembers(loadedMembers);
      setLocalPosts(loadedPosts);
    }).catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  const memberPosts = useMemo(
    () => [...localPosts]
      .filter((post) => post.memberId === id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [id, localPosts],
  );
  const currentStreak = useMemo(
    () => calculateCurrentStreak(localPosts, id),
    [id, localPosts],
  );

  if (!currentUser) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG \uB85C\uB529 \uC911...</p></main>;
  }

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-6 text-center text-stone-950">
        <div><p className="text-6xl">{"\u{1F50D}"}</p><h1 className="mt-5 text-3xl font-black">{"\uBA64\uBC84\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694"}</h1><Link href="/" className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white">{"\uD648\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30"}</Link></div>
      </main>
    );
  }

  const isMe = member.id === currentUser.id;

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <header className="border-b border-black/[0.06] bg-[#f5f3ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/feed" className="flex items-center gap-2 text-sm font-black transition hover:-translate-x-1">{"\u2190 \uB7A9 \uD53C\uB4DC"}</Link>
          <Link href="/" className="text-lg font-black tracking-[-0.04em]">LABLOG</Link>
          <div className="flex items-center gap-2">
            <NotificationsBell userId={currentUser.id} />
            <button type="button" onClick={async () => { await logoutAccount(); router.replace("/login"); }} className="hidden text-right text-xs font-bold text-stone-400 hover:text-stone-900 sm:block">{"\uB85C\uADF8\uC544\uC6C3"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-[#181611] px-6 py-8 text-white shadow-[0_24px_80px_rgba(40,32,14,0.18)] sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: member.avatarBackground }} />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-2xl font-black text-stone-950 shadow-[0_0_0_6px_rgba(255,255,255,.08)] sm:h-28 sm:w-28" style={{ background: member.avatarBackground }}>{member.initials}</div>
              <div>
                <div className="flex items-center gap-2"><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{member.name}</h1>{isMe && <span className="rounded-full bg-[#ffd84d] px-2 py-1 text-[10px] font-black text-stone-950">ME</span>}</div>
                <p className="mt-2 text-sm font-semibold text-white/55">{member.role}</p>
                <p className="mt-4 flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />{member.status}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="min-w-24 rounded-2xl bg-orange-500/20 px-5 py-4 text-center"><p className="text-2xl font-black">🔥 {currentStreak}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">day streak</p></div>
              <div className="min-w-24 rounded-2xl bg-white/10 px-5 py-4 text-center"><p className="text-2xl font-black">{memberPosts.length}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">records</p></div>
              {isMe && <Link href="/update#new-post" className="flex items-center rounded-2xl bg-[#ffd84d] px-5 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5">{"\uC0C8 \uAE30\uB85D \uC62C\uB9AC\uAE30"}</Link>}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Daily archive</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{"\uC624\uB298\uC758 \uAE30\uB85D\uB4E4"}</h2></div>
            <p className="hidden text-sm font-semibold text-stone-400 sm:block">{member.name}{"\uB2D8\uC758 \uC5F0\uAD6C\uC2E4 \uC77C\uC0C1"}</p>
          </div>

          {memberPosts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {memberPosts.map((post) => <DailyPostCard key={post.id} post={post} member={member} currentUserId={currentUser.id} members={members} />)}
            </div>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white/45 px-6 py-16 text-center">
              <p className="text-5xl">{"\u{1F4F7}"}</p>
              <h3 className="mt-5 text-xl font-black">{isMe ? "\uC544\uC9C1 \uC62C\uB9B0 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694" : "\uC544\uC9C1 \uACF5\uC720\uB41C \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694"}</h3>
              <p className="mt-2 text-sm font-medium text-stone-400">{isMe ? "\uC624\uB298 \uD55C \uC77C\uC744 \uCCAB \uC0AC\uC9C4\uC73C\uB85C \uB0A8\uACA8 \uBCF4\uC138\uC694." : "\uCCAB \uAE30\uB85D\uC744 \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694."}</p>
              {isMe && <Link href="/update#new-post" className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">{"\uAE30\uB85D \uC62C\uB9AC\uAE30"}</Link>}
            </div>
          )}
        </section>

        <section className="mt-14 border-t border-black/[0.07] pt-8">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-stone-400">More lab members</p>
          <div className="flex flex-wrap gap-3">
            {members.filter((item) => item.id !== member.id).map((item) => (
              <Link key={item.id} href={`/members/${item.id}`} className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-bold shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-0.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black" style={{ background: item.avatarBackground }}>{item.initials}</span>{item.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
