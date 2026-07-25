import {
  resolveFeatureCompletion,
  type FeatureAccessRole,
} from "./feature-access";

type FeatureRouteAccess = {
  path: string;
  userId: string;
  memberPathId: string | null;
  role: FeatureAccessRole;
  chapterTwoCompletedAt: string | null;
  chapterThreeCompletedAt: string | null;
};

export function resolveAuthenticatedFeatureRedirect({
  path,
  userId,
  memberPathId,
  role,
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
    return `/labquest?chapter=2&locked=${path.slice(1)}`;
  }
  if (path === "/meeting" && !chapterTwoCompleted) {
    return "/labquest?chapter=2&locked=project";
  }
  if (path === "/meeting" && !chapterThreeCompleted) {
    return "/labquest?chapter=3";
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
) {
  return onboardingCompleted ? `/members/${userId}` : "/labquest";
}

export function resolvePortalFeatureHref(
  feature: PortalFeatureId,
  chapterTwoCompleted: boolean,
  chapterThreeCompleted: boolean,
) {
  if (feature === "feed") {
    return chapterTwoCompleted
      ? "/update#feed"
      : "/labquest?chapter=2&locked=feed";
  }
  if (feature === "mission") {
    return chapterTwoCompleted
      ? "/mission"
      : "/labquest?chapter=2&locked=mission";
  }
  if (!chapterTwoCompleted) {
    return "/labquest?chapter=2&locked=project";
  }
  return chapterThreeCompleted ? "/meeting" : "/labquest?chapter=3";
}
