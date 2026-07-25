import type { Lab } from "./lab-tenancy";

export type LabDeepLinkDecision =
  | { action: "wait" }
  | { action: "open"; lab: Lab }
  | { action: "manage" };

export function shouldNavigateForLabSwitch(
  currentHref: string,
  redirectTo: string,
) {
  return new URL(redirectTo, currentHref).href !== currentHref;
}

export function resolveLabDeepLink(
  requestedSlug: string,
  activeLab: Lab,
  labs: Lab[],
  isLoading: boolean,
): LabDeepLinkDecision {
  if (activeLab.slug === requestedSlug) {
    return { action: "open", lab: activeLab };
  }
  if (isLoading) return { action: "wait" };

  const requestedLab = labs.find((lab) => lab.slug === requestedSlug);
  return requestedLab
    ? { action: "open", lab: requestedLab }
    : { action: "manage" };
}
