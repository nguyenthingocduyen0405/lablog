"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAccount } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { createClient } from "../lib/supabase/client";
import LanguageSwitcher from "./language-switcher";

export default function GlobalHeaderControls() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.session));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutAccount();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="absolute right-5 top-10 z-[65] flex items-center gap-2 print:hidden sm:right-8">
      <LanguageSwitcher compact />
      <span className="block w-24">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => void logOut()}
            disabled={isLoggingOut}
            className="w-full rounded-full bg-stone-950 px-4 py-3 text-sm font-black text-white shadow-sm disabled:cursor-wait disabled:opacity-60"
          >
            {t("logout")}
          </button>
        )}
      </span>
    </div>
  );
}
