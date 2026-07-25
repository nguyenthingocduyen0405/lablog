import {
  resolveFeatureCompletion,
  type FeatureAccessRole,
} from "./feature-access";
import { labQuestHref } from "./lab-routing";

type FeatureRouteAccess = {
  path: string;
  userId: string;
  memberPathId: string | null;
  role: FeatureAccessRole;
  labSlug: string;
  chapterTwoCompletedAt: string | null;
  chapterThreeCompletedAt: string | null;
};

export function resolveAuthenticatedFeatureRedirect({
  path,
  userId,
  memberPathId,
  role,
  labSlug,
  chapterTwoCompletedAt,
  chapterThreeCompletedAt,
}: FeatureRouteAccess) {
  const chapterTwoCompleted = Boolean(
    resolveFeatureCompletion(role, chapterTwoCompletedAt),
  );
  const chapterThreeCompleted = Boolean(
    resolveFeatureCompletion(role, chapterThreeCompletedAt),
  );

  if ((path === "/update" || path === "/mission") && !chapterTwoCompleted) {
    return labQuestHref(labSlug, {
      chapter: 2,
      locked: path.slice(1),
    });
  }
  if (path === "/meeting" && !chapterTwoCompleted) {
    return labQuestHref(labSlug, { chapter: 2, locked: "project" });
  }
  if (path === "/meeting" && !chapterThreeCompleted) {
    return labQuestHref(labSlug, { chapter: 3 });
  }
  if (memberPathId && memberPathId !== userId && !chapterTwoCompleted) {
    return `/members/${userId}?locked=team`;
  }
  return null;
}

export type PortalFeatureId = "feed" | "mission" | "project";

export function resolvePortalQuestHref(
  userId: string,
  onboardingCompleted: boolean,
  labSlug: string,
) {
  return onboardingCompleted
    ? `/members/${userId}`
    : labQuestHref(labSlug);
}

export function resolvePortalFeatureHref(
  feature: PortalFeatureId,
  chapterTwoCompleted: boolean,
  chapterThreeCompleted: boolean,
  labSlug: string,
) {
  if (feature === "feed") {
    return chapterTwoCompleted
      ? "/update#feed"
      : labQuestHref(labSlug, { chapter: 2, locked: "feed" });
  }
  if (feature === "mission") {
    return chapterTwoCompleted
      ? "/mission"
      : labQuestHref(labSlug, { chapter: 2, locked: "mission" });
  }
  if (!chapterTwoCompleted) {
    return labQuestHref(labSlug, { chapter: 2, locked: "project" });
  }
  return chapterThreeCompleted
    ? "/meeting"
    : labQuestHref(labSlug, { chapter: 3 });
}
