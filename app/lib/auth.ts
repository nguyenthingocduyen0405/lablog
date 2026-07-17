import { mapAvatarConfig, type LabMember } from "./lab-social";
import { createClient } from "./supabase/client";

export type AuthUser = LabMember & { email: string; onboardingCompletedAt: string | null };

const avatarBackgrounds = [
  "linear-gradient(135deg, #ffd84d, #ff8a4c)",
  "linear-gradient(135deg, #b59cff, #7457ff)",
  "linear-gradient(135deg, #68e0cf, #25a18e)",
  "linear-gradient(135deg, #ff9eb5, #ff5d8f)",
  "linear-gradient(135deg, #76b6ff, #3478f6)",
];

const USER_CACHE_MS = 15_000;
let currentUserCache: { value: AuthUser; expiresAt: number } | null = null;
let currentUserRequest: Promise<AuthUser | null> | null = null;

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.slice(-2).map((part) => part[0]).join("").toUpperCase();
  return Array.from(name.trim()).slice(0, 2).join("").toUpperCase();
}

function mapProfile(profile: Record<string, unknown>, email = ""): AuthUser {
  return {
    id: String(profile.id ?? ""),
    name: String(profile.name ?? ""),
    email,
    initials: String(profile.initials ?? ""),
    role: String(profile.role ?? ""),
    status: String(profile.status ?? ""),
    avatarBackground: String(profile.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)"),
    avatarConfig: mapAvatarConfig(profile.avatar_config),
    onboardingCompletedAt: typeof profile.onboarding_completed_at === "string" ? profile.onboarding_completed_at : null,
  };
}

export async function registerAccount(input: { name: string; email: string; password: string; role: string }) {
  currentUserCache = null;
  const supabase = createClient();
  const paletteIndex = Math.abs(input.email.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0)) % avatarBackgrounds.length;
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        role: input.role.trim(),
        initials: makeInitials(input.name),
        avatar_background: avatarBackgrounds[paletteIndex],
      },
    },
  });
  if (error) throw error;
  return { hasSession: Boolean(data.session) };
}

export async function loginAccount(email: string, password: string) {
  currentUserCache = null;
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background,avatar_config,onboarding_completed_at").eq("id", authData.user.id).single();
  if (profileError) {
    if (profileError.code === "PGRST116") await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  const user = mapProfile(profile, authData.user.email ?? "");
  currentUserCache = { value: user, expiresAt: Date.now() + USER_CACHE_MS };
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (currentUserCache && currentUserCache.expiresAt > Date.now()) return currentUserCache.value;
  if (currentUserRequest) return currentUserRequest;
  currentUserRequest = fetchCurrentUser();
  try {
    return await currentUserRequest;
  } finally {
    currentUserRequest = null;
  }
}

export async function completeOnboarding(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  if (currentUserCache?.value.id === userId) {
    currentUserCache = {
      value: { ...currentUserCache.value, onboardingCompletedAt: new Date().toISOString() },
      expiresAt: Date.now() + USER_CACHE_MS,
    };
  }
}

export async function logoutAccount() {
  currentUserCache = null;
  currentUserRequest = null;
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
