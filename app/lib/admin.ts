"use client";

import { createClient } from "./supabase/client";
import type { LabRole } from "./lab-tenancy";

export type LabAdminMember = {
  userId: string;
  name: string;
  profileRole: string;
  status: string;
  membershipRole: LabRole;
  seatIndex: number | null;
  joinedAt: string;
};

export type PlatformLabSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
};

export type PlatformOverview = {
  labs: PlatformLabSummary[];
  accountCount: number;
  membershipCount: number;
};

export async function isPlatformAdmin() {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function loadPlatformOverview(): Promise<PlatformOverview> {
  const supabase = createClient();
  const [labsResult, membershipsResult, profilesResult] = await Promise.all([
    supabase
      .from("labs")
      .select("id,slug,name,description,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("lab_members").select("lab_id,user_id"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  if (labsResult.error) throw labsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const memberCounts = new Map<string, number>();
  for (const membership of membershipsResult.data ?? []) {
    const labId = String(membership.lab_id);
    memberCounts.set(labId, (memberCounts.get(labId) ?? 0) + 1);
  }

  return {
    labs: (labsResult.data ?? []).map((lab: Record<string, unknown>) => ({
      id: String(lab.id),
      slug: String(lab.slug),
      name: String(lab.name),
      description: String(lab.description ?? ""),
      memberCount: memberCounts.get(String(lab.id)) ?? 0,
      createdAt: String(lab.created_at),
    })),
    accountCount: profilesResult.count ?? 0,
    membershipCount: (membershipsResult.data ?? []).length,
  };
}

export async function loadLabAdminMembers(
  labId: string,
): Promise<LabAdminMember[]> {
  const supabase = createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("lab_members")
    .select("user_id,membership_role,seat_index,joined_at")
    .eq("lab_id", labId)
    .order("joined_at", { ascending: true });
  if (membershipError) throw membershipError;

  const userIds = (memberships ?? []).map((membership: Record<string, unknown>) =>
    String(membership.user_id),
  );
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,role,status")
    .in("id", userIds);
  if (profileError) throw profileError;
  const profilesById = new Map<string, Record<string, unknown>>(
    (profiles ?? []).map((profile: Record<string, unknown>) => [
      String(profile.id),
      profile,
    ] as [string, Record<string, unknown>]),
  );

  return (memberships ?? []).map((membership: Record<string, unknown>) => {
    const userId = String(membership.user_id);
    const profile = profilesById.get(userId);
    return {
      userId,
      name: String(profile?.name ?? "Lab member"),
      profileRole: String(profile?.role ?? ""),
      status: String(profile?.status ?? ""),
      membershipRole: String(membership.membership_role) as LabRole,
      seatIndex:
        typeof membership.seat_index === "number"
          ? membership.seat_index
          : null,
      joinedAt: String(membership.joined_at),
    };
  });
}

export async function updateLabMemberRole(
  labId: string,
  userId: string,
  role: Exclude<LabRole, "owner">,
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_lab_member_role", {
    target_lab_id: labId,
    target_user_id: userId,
    target_role: role,
  });
  if (error) throw error;
}

export async function removeLabMember(labId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_lab_member", {
    target_lab_id: labId,
    target_user_id: userId,
  });
  if (error) throw error;
}

export async function rotateLabJoinCode(labId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rotate_lab_join_code", {
    target_lab_id: labId,
  });
  if (error) throw error;
  return String(data);
}
