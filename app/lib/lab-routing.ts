import type { Lab } from "./lab-tenancy";

export type LabQuestHrefOptions = {
  chapter?: number;
  locked?: string;
};

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
