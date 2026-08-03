export type FeatureAccessRole = "owner" | "admin" | "member";

export const ADMIN_FEATURE_ACCESS_AT = "1970-01-01T00:00:00.000Z";

export const FEATURE_UNLOCK_STAGES = [
  {
    id: "open",
    label: "Always available",
    features: ["Calendar"],
  },
  {
    id: "chapter2",
    label: "Complete Chapter 2",
    features: ["Update", "Feed", "Mission", "Team"],
  },
  {
    id: "chapter3",
    label: "Complete Chapter 3",
    features: ["Project", "Meeting"],
  },
] as const;

export function resolveFeatureCompletion(
  role: FeatureAccessRole,
  completedAt: string | null,
) {
  return role === "owner" || role === "admin"
    ? completedAt || ADMIN_FEATURE_ACCESS_AT
    : completedAt;
}

export function resolvePersistedFeatureCompletion(
  progressCompletedAt: string | null | undefined,
  legacyCompletedAt: unknown,
  allowLegacyFallback: boolean,
) {
  if (typeof progressCompletedAt === 'string') return progressCompletedAt;
  return allowLegacyFallback && typeof legacyCompletedAt === 'string'
    ? legacyCompletedAt
    : null;
}

export function isLegacyFeatureProgressLab(
  activeLabId: string,
  legacyLabId: string,
) {
  return activeLabId === legacyLabId;
}
