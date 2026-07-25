import {
  clearLabDataCaches,
  mapAvatarConfig,
  type LabMember,
} from "./lab-social";
import { createClient } from "./supabase/client";
import { DEFAULT_OS_LAB_ID, getActiveLabId } from "./lab-tenancy";
import {
  resolveFeatureCompletion,
  type FeatureAccessRole,
} from "./feature-access";

export type AuthUser = LabMember & {
  email: string;
  labTourCompletedAt: string | null;
  onboardingCompletedAt: string | null;
  chapterTwoCompletedAt: string | null;
  chapterThreeCompletedAt: string | null;
};

const avatarBackgrounds = [
  "linear-gradient(135deg, #ffd84d, #ff8a4c)",
  "linear-gradient(135deg, #b59cff, #7457ff)",
  "linear-gradient(135deg, #68e0cf, #25a18e)",
  "linear-gradient(135deg, #ff9eb5, #ff5d8f)",
  "linear-gradient(135deg, #76b6ff, #3478f6)",
];

const USER_CACHE_MS = 15_000;
let currentUserCache: {
  value: AuthUser;
  expiresAt: number;
  labId: string;
} | null = null;
let currentUserRequest: {
  labId: string;
  promise: Promise<AuthUser | null>;
} | null = null;

export function clearAuthCache() {
  currentUserCache = null;
  currentUserRequest = null;
  clearLabDataCaches();
}

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1)
    return parts
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
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
    avatarBackground: String(
      profile.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)",
    ),
    avatarConfig: mapAvatarConfig(profile.avatar_config),
    labSeat: typeof profile.lab_seat === "number" ? profile.lab_seat : null,
    labTourCompletedAt: null,
    onboardingCompletedAt:
      typeof profile.onboarding_completed_at === "string"
        ? profile.onboarding_completed_at
        : null,
    chapterTwoCompletedAt: null,
    chapterThreeCompletedAt: null,
  };
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  joinCode?: string;
}) {
  clearAuthCache();
  const supabase = createClient();
  const paletteIndex =
    Math.abs(
      input.email
        .split("")
        .reduce((sum, character) => sum + character.charCodeAt(0), 0),
    ) % avatarBackgrounds.length;
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        role: input.role.trim(),
        initials: makeInitials(input.name),
        avatar_background: avatarBackgrounds[paletteIndex],
        join_code: input.joinCode?.trim().toUpperCase() || "",
      },
    },
  });
  if (error) throw error;
  return { hasSession: Boolean(data.session) };
}

export async function loginAccount(email: string, password: string) {
  clearAuthCache();
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

async function fetchCurrentUser(activeLabId: string): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,name,role,status,initials,avatar_background,avatar_config,lab_seat,onboarding_completed_at",
    )
    .eq("id", authData.user.id)
    .single();
  if (profileError?.code === "42703") {
    const fallback = await supabase
      .from("profiles")
      .select(
        "id,name,role,status,initials,avatar_background,avatar_config,onboarding_completed_at",
      )
      .eq("id", authData.user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, lab_seat: null } : null;
    profileError = fallback.error;
  }
  if (profileError) {
    if (profileError.code === "PGRST116")
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }
  const [membershipResult, progressResult, platformAdminResult] = await Promise.all([
    supabase
      .from("lab_members")
      .select("seat_index,membership_role")
      .eq("lab_id", activeLabId)
      .eq("user_id", authData.user.id)
      .maybeSingle(),
    supabase
      .from("lab_member_progress")
      .select(
        "lab_tour_completed_at,onboarding_completed_at,chapter_two_completed_at,chapter_three_completed_at",
      )
      .eq("lab_id", activeLabId)
      .eq("user_id", authData.user.id)
      .maybeSingle(),
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .maybeSingle(),
  ]);
  const labProgress = progressResult.data;
  const membershipRole = ["owner", "admin", "member"].includes(
    String(membershipResult.data?.membership_role),
  )
    ? (String(
        membershipResult.data?.membership_role,
      ) as FeatureAccessRole)
    : !platformAdminResult.error && platformAdminResult.data
      ? "admin"
      : "member";
  const hasLabProgress = !progressResult.error && Boolean(labProgress);
  const useLegacyOsData = activeLabId === DEFAULT_OS_LAB_ID && !hasLabProgress;
  const rawOnboardingCompletedAt = hasLabProgress
    ? labProgress?.onboarding_completed_at ?? null
    : useLegacyOsData
      ? profile.onboarding_completed_at ?? null
      : null;
  const user = {
    ...mapProfile(profile, authData.user.email ?? ""),
    labSeat:
      typeof membershipResult.data?.seat_index === "number"
        ? membershipResult.data.seat_index
        : activeLabId === DEFAULT_OS_LAB_ID && membershipResult.error
          ? typeof profile.lab_seat === "number"
            ? profile.lab_seat
            : null
          : null,
    labTourCompletedAt: resolveFeatureCompletion(
      membershipRole,
      hasLabProgress
        ? labProgress?.lab_tour_completed_at ?? rawOnboardingCompletedAt
        : rawOnboardingCompletedAt,
    ),
    onboardingCompletedAt: resolveFeatureCompletion(
      membershipRole,
      rawOnboardingCompletedAt,
    ),
    chapterTwoCompletedAt: resolveFeatureCompletion(
      membershipRole,
      hasLabProgress
        ? labProgress?.chapter_two_completed_at ?? null
        : useLegacyOsData
          ? authData.user.user_metadata?.labquest_chapter2_completed_at ?? null
          : null,
    ),
    chapterThreeCompletedAt: resolveFeatureCompletion(
      membershipRole,
      hasLabProgress
        ? labProgress?.chapter_three_completed_at ?? null
        : useLegacyOsData
          ? authData.user.user_metadata?.labquest_chapter3_completed_at ?? null
          : null,
    ),
  };
  if (activeLabId === getActiveLabId()) {
    currentUserCache = {
      value: user,
      expiresAt: Date.now() + USER_CACHE_MS,
      labId: activeLabId,
    };
  }
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const activeLabId = getActiveLabId();
  if (
    currentUserCache &&
    currentUserCache.labId === activeLabId &&
    currentUserCache.expiresAt > Date.now()
  )
    return currentUserCache.value;
  if (currentUserRequest?.labId === activeLabId) {
    return currentUserRequest.promise;
  }
  const promise = fetchCurrentUser(activeLabId);
  currentUserRequest = { labId: activeLabId, promise };
  try {
    return await promise;
  } finally {
    if (currentUserRequest?.promise === promise) currentUserRequest = null;
  }
}

export async function completeOnboarding(userId: string) {
  const completedAt = new Date().toISOString();
  const supabase = createClient();
  const { error } = await supabase.from("lab_member_progress").upsert(
    {
      lab_id: getActiveLabId(),
      user_id: userId,
      lab_tour_completed_at: completedAt,
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    },
    { onConflict: "lab_id,user_id" },
  );
  if (error) throw error;
  if (currentUserCache?.value.id === userId) {
    currentUserCache = {
      value: {
        ...currentUserCache.value,
        labTourCompletedAt: completedAt,
        onboardingCompletedAt: completedAt,
      },
      expiresAt: Date.now() + USER_CACHE_MS,
      labId: getActiveLabId(),
    };
  }
}

export async function completeLabTour(userId: string) {
  const completedAt = new Date().toISOString();
  const activeLabId = getActiveLabId();
  const supabase = createClient();
  const { error } = await supabase.from("lab_member_progress").upsert(
    {
      lab_id: activeLabId,
      user_id: userId,
      lab_tour_completed_at: completedAt,
      updated_at: completedAt,
    },
    { onConflict: "lab_id,user_id" },
  );
  if (error) throw error;
  if (currentUserCache?.value.id === userId) {
    currentUserCache = {
      value: { ...currentUserCache.value, labTourCompletedAt: completedAt },
      expiresAt: Date.now() + USER_CACHE_MS,
      labId: activeLabId,
    };
  }
}

export async function completeChapterTwo(userId: string) {
  const completedAt = new Date().toISOString();
  const supabase = createClient();
  const { error: progressError } = await supabase
    .from("lab_member_progress")
    .upsert(
      {
        lab_id: getActiveLabId(),
        user_id: userId,
        chapter_two_completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "lab_id,user_id" },
    );
  if (progressError) throw progressError;
  const { error } = await supabase.auth.updateUser({
    data: { labquest_chapter2_completed_at: completedAt },
  });
  if (error) throw error;
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (currentUserCache?.value.id === userId) {
    currentUserCache = {
      value: { ...currentUserCache.value, chapterTwoCompletedAt: completedAt },
      expiresAt: Date.now() + USER_CACHE_MS,
      labId: getActiveLabId(),
    };
  }
}
export async function completeChapterThree(userId: string) {
  const completedAt = new Date().toISOString();
  const supabase = createClient();
  const { error: progressError } = await supabase
    .from("lab_member_progress")
    .upsert(
      {
        lab_id: getActiveLabId(),
        user_id: userId,
        chapter_three_completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "lab_id,user_id" },
    );
  if (progressError) throw progressError;
  const { error } = await supabase.auth.updateUser({
    data: { labquest_chapter3_completed_at: completedAt },
  });
  if (error) throw error;
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (currentUserCache?.value.id === userId) {
    currentUserCache = {
      value: {
        ...currentUserCache.value,
        chapterThreeCompletedAt: completedAt,
      },
      expiresAt: Date.now() + USER_CACHE_MS,
      labId: getActiveLabId(),
    };
  }
}

export async function logoutAccount() {
  clearAuthCache();
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
