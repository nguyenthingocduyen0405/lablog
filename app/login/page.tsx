"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, loginAccount } from "../lib/auth";
import LanguageSwitcher from "../components/language-switcher";
import { useI18n } from "../lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, l } = useI18n();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) router.replace("/");
      })
      .catch(() => undefined);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");
    try {
      await loginAccount(
        String(formData.get("email")),
        String(formData.get("password")),
      );
      router.replace("/");
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen bg-[#f5f3ee] text-stone-950 lg:grid-cols-2">
      <div className="absolute right-5 top-5 z-20">
        <LanguageSwitcher compact />
      </div>
      <section className="relative hidden overflow-hidden bg-[#181611] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#ffd84d]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 rotate-[-6deg] items-center justify-center rounded-2xl bg-[#ffd84d] text-2xl">
            {"\u{1F4F8}"}
          </span>
          <span className="text-2xl font-black">LABLOG</span>
        </div>
        <div className="relative">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd84d]">
            {l("오늘의 우리 랩", "Lab của chúng ta hôm nay", "Our lab, today")}
          </p>
          <h1 className="mt-5 whitespace-pre-line text-6xl font-black leading-[1.02] tracking-[-0.06em]">
            {t("labTodayTitle")}
          </h1>
          <p className="mt-6 max-w-md leading-7 text-white/50">
            {t("labTodayDescription")}
          </p>
        </div>
        <p className="relative text-xs font-bold text-white/25">
          {l(
            "우리 랩만의 공간",
            "KHÔNG GIAN RIÊNG CHO LAB",
            "PRIVATE SPACE FOR YOUR LAB",
          )}
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffd84d] text-xl">
              {"\u{1F4F8}"}
            </span>
            <span className="text-xl font-black">LABLOG</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
            {l("다시 오신 것을 환영해요", "Chào mừng trở lại", "Welcome back")}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
            {t("welcomeBack")}
          </h1>
          <p className="mt-3 text-sm font-medium text-stone-500">
            {t("welcomeDescription")}
          </p>
          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className="text-sm font-black">{t("email")}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@lab.ac.kr"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-stone-900 focus:ring-4 focus:ring-[#ffd84d]/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black">{t("password")}</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                placeholder="6+"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-stone-900 focus:ring-4 focus:ring-[#ffd84d]/30"
              />
            </label>
            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full rounded-2xl bg-[#181611] px-5 py-4 text-sm font-black text-white shadow-[0_6px_0_#d3aa00] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
            >
              {isSubmitting ? t("loggingIn") : t("login")}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-stone-500">
            {t("noAccount")}{" "}
            <Link
              href="/signup"
              className="font-black text-stone-950 underline decoration-[#ffd84d] decoration-4 underline-offset-4"
            >
              {t("signup")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
