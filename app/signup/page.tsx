"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, registerAccount } from "../lib/auth";

function getSignupErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "\uACC4\uC815\uC744 \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694.";
  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already been registered")) return "\uC774\uBBF8 \uAC00\uC785\uB41C \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4. \uB85C\uADF8\uC778\uC744 \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
  if (message.includes("email address not authorized")) return "Supabase\uC5D0\uC11C \uD5C8\uC6A9\uB41C \uC774\uBA54\uC77C\uC774 \uC544\uB2D9\uB2C8\uB2E4. Confirm Email\uC744 \uB044\uAC70\uB098 SMTP\uB97C \uC124\uC815\uD574 \uC8FC\uC138\uC694.";
  if (message.includes("rate limit")) return "\uC774\uBA54\uC77C \uBC1C\uC1A1 \uD55C\uB3C4\uB97C \uCD08\uACFC\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
  if (message.includes("database error")) return "\uD504\uB85C\uD544 \uC0DD\uC131 \uC911 \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. Supabase Logs\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
  return `Supabase: ${error.message}`;
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => { if (user) router.replace("/"); }).catch(() => undefined);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirmation"))) {
      setError("\uBE44\uBC00\uBC88\uD638\uAC00 \uC11C\uB85C \uB2EC\uB77C\uC694.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await registerAccount({ name: String(formData.get("name")), email: String(formData.get("email")), password, role: String(formData.get("role")) });
      router.replace(result.hasSession ? "/" : "/login");
    } catch (caughtError) {
      setError(getSignupErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass = "mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-stone-900 focus:ring-4 focus:ring-[#ffd84d]/30";

  return (
    <main className="min-h-screen bg-[#181611] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between"><Link href="/login" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffd84d] text-xl">{"\u{1F4F8}"}</span><span className="text-xl font-black">LABLOG</span></Link><Link href="/login" className="text-sm font-bold text-white/55">{"\uB85C\uADF8\uC778"}</Link></header>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <section><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd84d]">Join your lab</p><h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.06em] sm:text-6xl">{"\uC5F0\uAD6C\uC2E4\uC758"}<br />{"\uC624\uB298\uC5D0 \uD569\uB958\uD574\uC694."}</h1><p className="mt-6 max-w-md leading-7 text-white/50">{"\uACC4\uC815\uC744 \uB9CC\uB4E4\uACE0 \uC624\uB298\uC758 \uC5F0\uAD6C \uAE30\uB85D\uC744 \uB7A9 \uBA64\uBC84\uB4E4\uACFC \uACF5\uC720\uD558\uC138\uC694."}</p></section>
          <section className="rounded-[2.25rem] bg-[#f5f3ee] p-6 text-stone-950 shadow-2xl sm:p-9">
            <h2 className="text-3xl font-black tracking-[-0.04em]">{"\uACC4\uC815 \uB9CC\uB4E4\uAE30"}</h2><p className="mt-2 text-sm text-stone-500">{"\uC5F0\uAD6C\uC2E4 \uBA64\uBC84 \uC815\uBCF4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694."}</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block"><span className="text-sm font-black">{"\uC774\uB984"}</span><input name="name" required autoComplete="name" placeholder="\uAE40\uC9C0\uC6B0" className={fieldClass} /></label>
              <label className="block"><span className="text-sm font-black">{"\uC774\uBA54\uC77C"}</span><input name="email" type="email" required autoComplete="email" placeholder="name@lab.ac.kr" className={fieldClass} /></label>
              <label className="block"><span className="text-sm font-black">{"\uC18C\uC18D · \uC5F0\uAD6C \uBD84\uC57C"}</span><input name="role" required placeholder="\uC11D\uC0AC\uACFC\uC815 · Operating Systems" className={fieldClass} /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-black">{"\uBE44\uBC00\uBC88\uD638"}</span><input name="password" type="password" required minLength={6} autoComplete="new-password" className={fieldClass} /></label><label className="block"><span className="text-sm font-black">{"\uBE44\uBC00\uBC88\uD638 \uD655\uC778"}</span><input name="confirmation" type="password" required minLength={6} autoComplete="new-password" className={fieldClass} /></label></div>
              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
              <button disabled={isSubmitting} type="submit" className="mt-2 w-full rounded-2xl bg-[#ffd84d] px-5 py-4 text-sm font-black text-stone-950 shadow-[0_6px_0_#181611] transition active:translate-y-1 active:shadow-none disabled:opacity-60">{isSubmitting ? "\uACC4\uC815 \uB9CC\uB4DC\uB294 \uC911..." : "\uAC00\uC785\uD558\uACE0 \uC2DC\uC791\uD558\uAE30"}</button>
            </form>
            <p className="mt-6 text-center text-sm text-stone-500">{"\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uB098\uC694?"} <Link href="/login" className="font-black text-stone-950 underline decoration-[#ffd84d] decoration-4 underline-offset-4">{"\uB85C\uADF8\uC778"}</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
