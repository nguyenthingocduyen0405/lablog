"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./supabase/client";
import { ensureStarterQuest } from "./quest-admin";
import { normalizeLabAccent } from "./lab-branding";
import { shouldNavigateForLabSwitch } from "./lab-routing";

export const DEFAULT_OS_LAB_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_OS_LAB_SLUG = "os-lab";
const ACTIVE_LAB_ID_KEY = "lablog-active-lab-id";
const ACTIVE_LAB_SLUG_KEY = "lablog-active-lab-slug";

export type LabRole = "owner" | "admin" | "member";

export type Lab = {
  id: string;
  slug: string;
  name: string;
  description: string;
  ownerId: string | null;
  logoUrl: string | null;
  mapImageUrl: string;
  defaultLocale: "ko" | "vi" | "en";
  themeConfig: Record<string, string>;
  joinCode: string;
  membershipRole: LabRole;
  seatIndex: number | null;
};

const OS_LAB_FALLBACK: Lab = {
  id: DEFAULT_OS_LAB_ID,
  slug: DEFAULT_OS_LAB_SLUG,
  name: "OS Lab",
  description: "Operating Systems Laboratory",
  ownerId: null,
  logoUrl: null,
  mapImageUrl: "/lab-tour-room-v5.png",
  defaultLocale: "ko",
  themeConfig: {
    accent: "#ffd84d",
    surface: "#f5f3ee",
    ink: "#181611",
  },
  joinCode: "",
  membershipRole: "member",
  seatIndex: null,
};

function mapLab(
  row: Record<string, unknown>,
  membership?: Record<string, unknown>,
): Lab {
  const locale = String(row.default_locale ?? "ko");
  return {
    id: String(row.id ?? DEFAULT_OS_LAB_ID),
    slug: String(row.slug ?? DEFAULT_OS_LAB_SLUG),
    name: String(row.name ?? "OS Lab"),
    description: String(row.description ?? ""),
    ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
    logoUrl: typeof row.logo_url === "string" ? row.logo_url : null,
    mapImageUrl: String(row.map_image_url ?? "/lab-tour-room-v5.png"),
    defaultLocale: ["ko", "vi", "en"].includes(locale)
      ? (locale as Lab["defaultLocale"])
      : "ko",
    themeConfig:
      row.theme_config && typeof row.theme_config === "object"
        ? (row.theme_config as Record<string, string>)
        : OS_LAB_FALLBACK.themeConfig,
    joinCode: String(row.join_code ?? ""),
    membershipRole: ["owner", "admin", "member"].includes(
      String(membership?.membership_role),
    )
      ? (String(membership?.membership_role) as LabRole)
      : "member",
    seatIndex:
      typeof membership?.seat_index === "number" ? membership.seat_index : null,
  };
}

function isMissingMultiLabSchema(
  error: { code?: string; message?: string } | null,
) {
  return Boolean(
    error &&
    (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "") ||
      error.message?.includes("lab_members") ||
      error.message?.includes("labs")),
  );
}

export function getActiveLabId() {
  if (typeof window === "undefined") return DEFAULT_OS_LAB_ID;
  return window.localStorage.getItem(ACTIVE_LAB_ID_KEY) || DEFAULT_OS_LAB_ID;
}

export function getActiveLabSlug() {
  if (typeof window === "undefined") return DEFAULT_OS_LAB_SLUG;
  return (
    window.localStorage.getItem(ACTIVE_LAB_SLUG_KEY) || DEFAULT_OS_LAB_SLUG
  );
}

export function storeActiveLab(lab: Pick<Lab, "id" | "slug">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_LAB_ID_KEY, lab.id);
  window.localStorage.setItem(ACTIVE_LAB_SLUG_KEY, lab.slug);
  document.cookie =
    ACTIVE_LAB_ID_KEY +
    "=" +
    encodeURIComponent(lab.id) +
    "; Path=/; Max-Age=31536000; SameSite=Lax";
}

export function clearStoredActiveLab() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_LAB_ID_KEY);
  window.localStorage.removeItem(ACTIVE_LAB_SLUG_KEY);
  document.cookie =
    ACTIVE_LAB_ID_KEY + "=; Path=/; Max-Age=0; SameSite=Lax";
}

async function fetchMyLabs(): Promise<{
  labs: Lab[];
  schemaReady: boolean;
}> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { labs: [], schemaReady: true };

  const { data: memberships, error: membershipError } = await supabase
    .from("lab_members")
    .select("lab_id,membership_role,seat_index")
    .eq("user_id", authData.user.id);

  if (membershipError) {
    if (isMissingMultiLabSchema(membershipError)) {
      return { labs: [OS_LAB_FALLBACK], schemaReady: false };
    }
    throw membershipError;
  }

  const { data: platformAdmin, error: platformAdminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  const isPlatformAdmin = !platformAdminError && Boolean(platformAdmin);

  const labIds = (memberships ?? []).map((membership) =>
    String(membership.lab_id),
  );
  if (labIds.length === 0 && !isPlatformAdmin) return { labs: [], schemaReady: true };

  const { data: memberLabRows, error: memberLabsError } = await supabase
    .from("labs")
    .select(
      "id,slug,name,description,owner_id,logo_url,map_image_url,default_locale,theme_config,join_code",
    )
    .in("id", labIds)
    .order("created_at", { ascending: true });
  if (memberLabsError) throw memberLabsError;

  const { data: platformLabRows, error: platformLabsError } = isPlatformAdmin
    ? await supabase
        .from("labs")
        .select(
          "id,slug,name,description,owner_id,logo_url,map_image_url,default_locale,theme_config,join_code",
        )
        .order("created_at", { ascending: true })
    : { data: null, error: null };
  if (platformLabsError) throw platformLabsError;
  const labRows = platformLabRows ?? memberLabRows;

  const membershipByLab = new Map(
    (memberships ?? []).map((membership) => [
      String(membership.lab_id),
      membership as Record<string, unknown>,
    ]),
  );
  if (isPlatformAdmin) {
    for (const row of labRows ?? []) {
      if (!membershipByLab.has(String(row.id))) {
        membershipByLab.set(String(row.id), { membership_role: "admin" });
      }
    }
  }
 return {
    labs: (labRows ?? []).map((row) =>
      mapLab(
        row as Record<string, unknown>,
        membershipByLab.get(String(row.id)),
      ),
    ),
    schemaReady: true,
  };
}

export async function getAccountLandingPath() {
  const result = await fetchMyLabs();
  if (result.labs.length !== 1) return "/labs";
  const [lab] = result.labs;
  storeActiveLab(lab);
  return "/labs/" + lab.slug;
}

type LabContextValue = {
  labs: Lab[];
  activeLab: Lab;
  isLoading: boolean;
  schemaReady: boolean;
  error: string;
  refreshLabs: () => Promise<void>;
  switchLab: (lab: Lab, redirectTo?: string) => void;
  createLab: (input: {
    name: string;
    slug: string;
    description: string;
    defaultLocale: "ko" | "vi" | "en";
  }) => Promise<Lab>;
  joinLab: (joinCode: string) => Promise<Lab>;
  updateLab: (
    labId: string,
    input: {
      name: string;
      description: string;
      logoUrl: string;
      mapImageUrl: string;
      defaultLocale: "ko" | "vi" | "en";
      accent: string;
    },
  ) => Promise<Lab>;
};

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [activeLab, setActiveLab] = useState<Lab>(OS_LAB_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [error, setError] = useState("");
  const authUserIdRef = useRef<string | null>(null);
  const refreshEpochRef = useRef(0);
  const labSwitchEpochRef = useRef(0);

  const refreshLabs = useCallback(async () => {
    const refreshEpoch = refreshEpochRef.current;
    try {
      const result = await fetchMyLabs();
      if (refreshEpoch !== refreshEpochRef.current) return;
      setError("");
      const nextLabs = result.labs;
      const storedId = getActiveLabId();
      const nextActive =
        nextLabs.find((lab) => lab.id === storedId) ??
        nextLabs[0] ??
        OS_LAB_FALLBACK;
      setLabs(nextLabs);
      setActiveLab(nextActive);
      setSchemaReady(result.schemaReady);
      if (nextLabs.length > 0) storeActiveLab(nextActive);
    } catch (caughtError) {
      if (refreshEpoch !== refreshEpochRef.current) return;
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load labs.",
      );
    } finally {
      if (refreshEpoch === refreshEpochRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimeoutId: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimeoutId !== null) window.clearTimeout(refreshTimeoutId);
      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void refreshLabs();
      }, 0);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      const accountChanged = authUserIdRef.current !== nextUserId;

      if (event === "SIGNED_OUT" || !nextUserId) {
        refreshEpochRef.current += 1;
        authUserIdRef.current = null;
        clearStoredActiveLab();
        setLabs([]);
        setActiveLab(OS_LAB_FALLBACK);
        setError("");
        setIsLoading(false);
        void import("./auth").then(({ clearAuthCache }) => clearAuthCache());
        return;
      }

      // INITIAL_SESSION hydrates the existing browser session. It is not an
      // account switch, so keep the lab stored for this user instead of
      // bouncing a lab route back through the fallback lab.
      if (event === "INITIAL_SESSION") {
        authUserIdRef.current = nextUserId;
        setIsLoading(true);
        scheduleRefresh();
        return;
      }

      if (accountChanged) {
        refreshEpochRef.current += 1;
        authUserIdRef.current = nextUserId;
        clearStoredActiveLab();
        setLabs([]);
        setActiveLab(OS_LAB_FALLBACK);
        setError("");
        setIsLoading(true);
        void import("./auth").then(({ clearAuthCache }) => clearAuthCache());
        scheduleRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimeoutId !== null) window.clearTimeout(refreshTimeoutId);
    };
  }, [refreshLabs]);

  const switchLab = useCallback((lab: Lab, redirectTo = "/") => {
    const switchEpoch = labSwitchEpochRef.current + 1;
    labSwitchEpochRef.current = switchEpoch;
    void import("./auth").then(({ clearAuthCache }) => {
      if (switchEpoch !== labSwitchEpochRef.current) return;
      clearAuthCache();
      storeActiveLab(lab);
      setActiveLab(lab);
      if (shouldNavigateForLabSwitch(window.location.href, redirectTo)) {
        window.location.assign(redirectTo);
      }
    });
  }, []);

  const createLab = useCallback(
    async (input: {
      name: string;
      slug: string;
      description: string;
      defaultLocale: "ko" | "vi" | "en";
    }) => {
      const supabase = createClient();
      const { data, error: createError } = await supabase.rpc("create_lab", {
        lab_name: input.name,
        lab_slug: input.slug,
        lab_description: input.description,
        lab_default_locale: input.defaultLocale,
      });
      if (createError) throw createError;
      const created = mapLab(data as Record<string, unknown>, {
        membership_role: "owner",
      });
      await ensureStarterQuest(created.id);
      await refreshLabs();
      const { clearAuthCache } = await import("./auth");
      clearAuthCache();
      storeActiveLab(created);
      return created;
    },
    [refreshLabs],
  );

  const joinLab = useCallback(
    async (joinCode: string) => {
      const supabase = createClient();
      const { data, error: joinError } = await supabase.rpc(
        "join_lab_by_code",
        { target_join_code: joinCode },
      );
      if (joinError) throw joinError;
      await refreshLabs();
      const joined = mapLab(data as Record<string, unknown>, {
        membership_role: "member",
      });
      const { clearAuthCache } = await import("./auth");
      clearAuthCache();
      storeActiveLab(joined);
      return joined;
    },
    [refreshLabs],
  );

  const updateLab = useCallback(
    async (
      labId: string,
      input: {
        name: string;
        description: string;
        logoUrl: string;
        mapImageUrl: string;
        defaultLocale: "ko" | "vi" | "en";
        accent: string;
      },
    ) => {
      const current = labs.find((lab) => lab.id === labId);
      if (!current) throw new Error("Lab not found.");
      if (!input.name.trim()) throw new Error("Lab name is required.");
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("labs")
        .update({
          name: input.name.trim(),
          description: input.description.trim(),
          logo_url: input.logoUrl.trim() || null,
          map_image_url: input.mapImageUrl.trim() || "/lab-tour-room-v5.png",
          default_locale: input.defaultLocale,
          theme_config: {
            ...current.themeConfig,
            accent: normalizeLabAccent(input.accent),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", labId)
        .select(
          "id,slug,name,description,owner_id,logo_url,map_image_url,default_locale,theme_config,join_code",
        )
        .single();
      if (updateError) throw updateError;
      const updated = mapLab(data as Record<string, unknown>, {
        membership_role: current.membershipRole,
        seat_index: current.seatIndex,
      });
      setLabs((value) =>
        value.map((lab) => (lab.id === updated.id ? updated : lab)),
      );
      if (activeLab.id === updated.id) {
        setActiveLab(updated);
        storeActiveLab(updated);
      }
      return updated;
    },
    [activeLab.id, labs],
  );

  const value = useMemo<LabContextValue>(
    () => ({
      labs,
      activeLab,
      isLoading,
      schemaReady,
      error,
      refreshLabs,
      switchLab,
      createLab,
      joinLab,
      updateLab,
    }),
    [
      activeLab,
      createLab,
      error,
      isLoading,
      joinLab,
      labs,
      refreshLabs,
      schemaReady,
      switchLab,
      updateLab,
    ],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const context = useContext(LabContext);
  if (!context) throw new Error("useLab must be used inside LabProvider");
  return context;
}
