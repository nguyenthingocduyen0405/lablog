"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import {
  calculateCurrentStreak,
  createDailyPost,
  hasMissionUpdateToday,
  hasPostedToday,
  isPostStatus,
  loadActiveMission,
  loadDailyPosts,
  POST_STATUSES,
  type DailyPost,
  type Mission,
} from "../lib/lab-social";

export default function UpdatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      const [activeMission, loadedPosts] = await Promise.all([
        loadActiveMission(currentUser.id),
        loadDailyPosts(),
      ]);
      if (cancelled) return;
      setUser(currentUser);
      setMission(activeMission);
      setPosts(loadedPosts);
    }).catch(() => setMessage("Supabase \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."));
    return () => { cancelled = true; };
  }, [router]);

  const currentStreak = useMemo(() => user ? calculateCurrentStreak(posts, user.id) : 0, [posts, user]);
  const postedToday = useMemo(() => user ? hasPostedToday(posts, user.id) : false, [posts, user]);
  const missionUpdated = mission ? hasMissionUpdateToday(posts, mission.id) : false;

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const photo = data.get("photo");
    const caption = String(data.get("caption")).trim();
    const statusValue = String(data.get("status"));
    if (!(photo instanceof File) || photo.size === 0 || !caption || !isPostStatus(statusValue) || !user) return;
    if (photo.size > 8 * 1024 * 1024) {
      setMessage("\uC0AC\uC9C4\uC740 8MB \uC774\uD558\uB85C \uC62C\uB824 \uC8FC\uC138\uC694.");
      return;
    }

    setIsPosting(true);
    setMessage("");
    try {
      const post = await createDailyPost(photo, caption, statusValue, user.id);
      setPosts((current) => [post, ...current]);
      setPreviewUrl("");
      form.reset();
      setMessage(post.scoreAwarded > 0
        ? `\uC624\uB298\uC758 \uC5C5\uB370\uC774\uD2B8 \uC644\uB8CC! +${post.scoreAwarded}P`
        : "\uC5C5\uB370\uC774\uD2B8\uAC00 \uC800\uC7A5\uB410\uC5B4\uC694. \uC624\uB298 \uC810\uC218\uB294 \uC774\uBBF8 \uBC1B\uC558\uC5B4\uC694.");
    } catch {
      setMessage("\uC5C5\uB370\uC774\uD2B8\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
    } finally {
      setIsPosting(false);
    }
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]"><p className="text-sm font-black text-stone-400">LABLOG</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <AppHeader user={user} />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">03 / Update</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{"\uC624\uB298\uC744 \uAE30\uB85D\uD574\uC694."}</h1>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-black/[0.05]"><p className="text-xl font-black">{"\uD83D\uDD25"} {currentStreak}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">streak</p></div>
            <div className={`rounded-2xl px-4 py-3 text-center ring-1 ${postedToday ? "bg-emerald-50 ring-emerald-200" : "bg-[#fff9df] ring-amber-200"}`}><p className="text-xl font-black">{postedToday ? "\u2713" : "\u00B7"}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">today</p></div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-xl">{"\uD83C\uDFAF"}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Current mission</p>
              <p className="mt-0.5 font-black">{mission?.title ?? "\uC544\uC9C1 \uC120\uD0DD\uD55C \uBBF8\uC158\uC774 \uC5C6\uC5B4\uC694"}</p>
              {mission && <p className="mt-1 text-xs font-bold text-violet-500">+{mission.pointsPerUpdate}P / day</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mission && <span className={`text-xs font-black ${missionUpdated ? "text-emerald-600" : "text-amber-600"}`}>{missionUpdated ? "\uC624\uB298 \uC644\uB8CC" : "\uC624\uB298 \uBBF8\uC644\uB8CC"}</span>}
            <Link href="/mission" className="rounded-full bg-stone-100 px-4 py-2 text-xs font-black text-stone-600 hover:bg-stone-200">{mission ? "\uBBF8\uC158 \uBC14\uAFB8\uAE30" : "\uBBF8\uC158 \uC120\uD0DD"}</Link>
          </div>
        </div>

        <section id="new-post" className="overflow-hidden rounded-[2.25rem] bg-[#181611] p-4 text-white shadow-[0_24px_80px_rgba(40,32,14,0.18)] sm:p-6">
          <form onSubmit={submitUpdate} className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="relative">
              <label className="group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-[1.75rem] border-2 border-dashed border-white/20 bg-white/[0.06] transition hover:border-[#ffd84d]/70" style={previewUrl ? { backgroundImage: `url("${previewUrl}")`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#0c0a09" } : undefined}>
                {!previewUrl && <span className="absolute inset-0 flex flex-col items-center justify-center text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd84d] text-3xl text-stone-950">{"\uD83D\uDCF7"}</span><span className="mt-4 text-sm font-bold">{"\uC624\uB298\uC758 \uC0AC\uC9C4 \uACE0\uB974\uAE30"}</span><span className="mt-1 text-xs text-white/45">JPG, PNG, WEBP - max 8MB</span></span>}
                {previewUrl && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur">{"\uC0AC\uC9C4 \uBC14\uAFB8\uAE30"}</span>}
                <input className="sr-only" name="photo" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) { setPreviewUrl(""); return; }
                  const reader = new FileReader();
                  reader.onload = () => setPreviewUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }} />
              </label>
              {previewUrl && <button type="button" aria-label="Remove selected photo" onClick={(event) => {
                const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input[name=photo]");
                if (input) input.value = "";
                setPreviewUrl("");
              }} className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white shadow-lg hover:bg-red-500">{"\u00D7"}</button>}
            </div>

            <div className="px-1 sm:px-3">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-black text-stone-950" style={{ background: user.avatarBackground }}>{user.initials}</span><div><p className="font-bold">{user.name}</p><p className="text-xs text-white/45">{"\uC624\uB298 \uBB50 \uD588\uC5B4\uC694?"}</p></div></div>
              <textarea name="caption" required maxLength={180} placeholder={"\uBC30\uC6B4 \uAC83, \uC9C4\uD589\uD55C \uAC83, \uB9C9\uD78C \uC810\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694..."} className="mt-5 min-h-32 w-full resize-none border-0 bg-transparent text-xl font-bold leading-8 text-white outline-none placeholder:text-white/25 sm:text-2xl" />
              <fieldset className="mt-4"><legend className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">{"\uAE30\uB85D \uC0C1\uD0DC"}</legend><div className="flex flex-wrap gap-2">{POST_STATUSES.map((status) => <label key={status.value} className="cursor-pointer"><input className="peer sr-only" type="radio" name="status" value={status.value} defaultChecked={status.value === "working"} /><span className="inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/65 ring-1 ring-white/10 transition peer-checked:bg-[#ffd84d] peer-checked:text-stone-950">{status.emoji} {status.label}</span></label>)}</div></fieldset>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-medium text-white/35">{"\uAE30\uB85D\uC740 \uBBF8\uC158\uACFC \uD53C\uB4DC\uC5D0 \uBC14\uB85C \uBC18\uC601\uB3FC\uC694."}</p><button disabled={isPosting} type="submit" className="rounded-full bg-[#ffd84d] px-6 py-3 text-sm font-black text-stone-950 shadow-[0_5px_0_#a88400] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-50">{isPosting ? "\uC62C\uB9AC\uB294 \uC911..." : "\uC624\uB298 \uC5C5\uB370\uC774\uD2B8"}</button></div>
              {message && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-[#ffe785]">{message}</p>}
            </div>
          </form>
        </section>

        <div className="mt-7 flex justify-between"><Link href="/mission" className="text-sm font-black text-stone-400 hover:text-stone-900">{"\u2190 Mission"}</Link><Link href="/feed" className="text-sm font-black text-stone-900 hover:underline">{"\uD53C\uB4DC\uC5D0\uC11C \uD655\uC778 \u2192"}</Link></div>
      </div>
    </main>
  );
}
