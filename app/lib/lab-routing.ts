import type { Lab } from "./lab-tenancy";

export type LabQuestHrefOptions = {
  chapter?: number;
  locked?: string;
};

export function labTourHref(labSlug: string) {
  return "/lab-tour?" + new URLSearchParams({ lab: labSlug }).toString();
}

export function resolveLabTourCompletionHref(
  userId: string,
  onboardingCompleted: boolean,
  labSlug: string,
) {
  return onboardingCompleted
    ? `/members/${userId}`
    : labQuestHref(labSlug);
}

export function labQuestHref(
  labSlug: string,
  options: LabQuestHrefOptions = {},
) {
  const params = new URLSearchParams({ lab: labSlug });
  if (Number.isInteger(options.chapter) && Number(options.chapter) > 0) {
    params.set("chapter", String(options.chapter));
  }
  if (options.locked?.trim()) params.set("locked", options.locked.trim());
  return "/labquest?" + params.toString();
}

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
