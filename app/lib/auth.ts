import type { LabMember } from "./lab-social";
import { createClient } from "./supabase/client";

export type AuthUser = LabMember & { email: string; onboardingCompletedAt: string | null };

const avatarBackgrounds = [
  "linear-gradient(135deg, #ffd84d, #ff8a4c)",
  "linear-gradient(135deg, #b59cff, #7457ff)",
  "linear-gradient(135deg, #68e0cf, #25a18e)",
  "linear-gradient(135deg, #ff9eb5, #ff5d8f)",
  "linear-gradient(135deg, #76b6ff, #3478f6)",
];

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.slice(-2).map((part) => part[0]).join("").toUpperCase();
  return Array.from(name.trim()).slice(0, 2).join("").toUpperCase();
}

function mapProfile(profile: Record<string, string | null>, email = ""): AuthUser {
  return {
    id: profile.id ?? "",
    name: profile.name ?? "",
    email,
    initials: profile.initials ?? "",
    role: profile.role ?? "",
    status: profile.status ?? "",
    avatarBackground: profile.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)",
    onboardingCompletedAt: profile.onboarding_completed_at,
  };
}

export async function registerAccount(input: { name: string; email: string; password: string; role: string }) {
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
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background,onboarding_completed_at").eq("id", authData.user.id).single();
  if (profileError || !profile) return null;
  return mapProfile(profile, authData.user.email ?? "");
}

export async function completeOnboarding(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function logoutAccount() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
