"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, registerAccount } from "../lib/auth";
import LanguageSwitcher from "../components/language-switcher";
import { useI18n } from "../lib/i18n";

function getSignupErrorMessage(
  error: unknown,
  l: (ko: string, vi: string, en: string) => string,
) {
  if (!(error instanceof Error))
    return l(
      "계정을 만들지 못했어요.",
      "Không thể tạo tài khoản.",
      "Could not create the account.",
    );
  const message = error.message.toLowerCase();
  if (
    message.includes("already registered") ||
    message.includes("already been registered")
  )
    return l(
      "이미 가입된 이메일입니다. 로그인을 시도해 주세요.",
      "Email này đã được đăng ký. Hãy thử đăng nhập.",
      "This email is already registered. Try logging in.",
    );
  if (message.includes("email address not authorized"))
    return l(
      "Supabase에서 허용된 이메일이 아닙니다. Confirm Email을 끄거나 SMTP를 설정해 주세요.",
      "Email chưa được Supabase cho phép. Hãy tắt Confirm Email hoặc cấu hình SMTP.",
      "This email is not authorized by Supabase. Disable Confirm Email or configure SMTP.",
    );
  if (message.includes("rate limit"))
    return l(
      "이메일 발송 한도를 초과했어요. 잠시 후 다시 시도해 주세요.",
      "Đã vượt giới hạn gửi email. Vui lòng thử lại sau.",
      "Email rate limit exceeded. Please try again later.",
    );
  if (message.includes("database error"))
    return l(
      "프로필 생성 중 데이터베이스 오류가 발생했어요. Supabase Logs를 확인해 주세요.",
      "Lỗi cơ sở dữ liệu khi tạo hồ sơ. Hãy kiểm tra Supabase Logs.",
      "A database error occurred while creating the profile. Check Supabase Logs.",
    );
  return `Supabase: ${error.message}`;
}

export default function SignupPage() {
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
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirmation"))) {
      setError(t("passwordMismatch"));
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await registerAccount({
        name: String(formData.get("name")),
        email: String(formData.get("email")),
        password,
        role: String(formData.get("role")),
      });
      router.replace(result.hasSession ? "/" : "/login");
    } catch (caughtError) {
      setError(getSignupErrorMessage(caughtError, l));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-stone-900 focus:ring-4 focus:ring-[#ffd84d]/30";

  return (
    <main className="min-h-screen bg-[#181611] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-3">
          <Link href="/login" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffd84d] text-xl">
              {"\u{1F4F8}"}
            </span>
            <span className="text-xl font-black">LABLOG</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact dark />
            <Link href="/login" className="text-sm font-bold text-white/55">
              {t("login")}
            </Link>
          </div>
        </header>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <section>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd84d]">
              {l("랩에 참여하세요", "THAM GIA LAB", "JOIN YOUR LAB")}
            </p>
            <h1 className="mt-5 whitespace-pre-line text-5xl font-black leading-[1.02] tracking-[-0.06em] sm:text-6xl">
              {t("joinYourLab")}
            </h1>
            <p className="mt-6 max-w-md leading-7 text-white/50">
              {t("joinDescription")}
            </p>
          </section>
          <section className="rounded-[2.25rem] bg-[#f5f3ee] p-6 text-stone-950 shadow-2xl sm:p-9">
            <h2 className="text-3xl font-black tracking-[-0.04em]">
              {t("createAccount")}
            </h2>
            <p className="mt-2 text-sm text-stone-500">{t("memberInfo")}</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-black">{t("name")}</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Kim Jiwoo"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black">{t("email")}</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@lab.ac.kr"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black">{t("role")}</span>
                <input
                  name="role"
                  required
                  placeholder="Operating Systems"
                  className={fieldClass}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black">{t("password")}</span>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-black">
                    {t("passwordConfirmation")}
                  </span>
                  <input
                    name="confirmation"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={fieldClass}
                  />
                </label>
              </div>
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </p>
              )}
              <button
                disabled={isSubmitting}
                type="submit"
                className="mt-2 w-full rounded-2xl bg-[#ffd84d] px-5 py-4 text-sm font-black text-stone-950 shadow-[0_6px_0_#181611] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
              >
                {isSubmitting ? t("creatingAccount") : t("signupAndStart")}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-stone-500">
              {t("alreadyAccount")}{" "}
              <Link
                href="/login"
                className="font-black text-stone-950 underline decoration-[#ffd84d] decoration-4 underline-offset-4"
              >
                {t("login")}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
