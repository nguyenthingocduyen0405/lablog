import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedFeatureRedirect } from "../feature-routing";
import type { FeatureAccessRole } from "../feature-access";

const DEFAULT_OS_LAB_ID = "11111111-1111-4111-8111-111111111111";
const DEFAULT_OS_LAB_SLUG = "os-lab";

import {
  isLegacyFeatureProgressLab,
  resolvePersistedFeatureCompletion,
} from '../feature-access';

type LabQuestClaims = {
  sub?: string;
  user_metadata?: { labquest_chapter2_completed_at?: unknown; labquest_chapter3_completed_at?: unknown };
};

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as LabQuestClaims | undefined;
  const isAuthenticated = Boolean(claims?.sub);
  let activeLabSlug =
    request.cookies.get("lablog-active-lab-slug")?.value ??
    DEFAULT_OS_LAB_SLUG;
  let membershipRole: FeatureAccessRole = "member";
  let chapterTwoCompletedAt =
    typeof claims?.user_metadata?.labquest_chapter2_completed_at === "string"
      ? claims.user_metadata.labquest_chapter2_completed_at
      : null;
  let chapterThreeCompletedAt =
    typeof claims?.user_metadata?.labquest_chapter3_completed_at === "string"
      ? claims.user_metadata.labquest_chapter3_completed_at
      : null;
  if (isAuthenticated) {
    const activeLabId =
      request.cookies.get("lablog-active-lab-id")?.value ??
      DEFAULT_OS_LAB_ID;
    const [membership, progress, platformAdmin, activeLab] = await Promise.all([
      supabase
        .from("lab_members")
        .select("membership_role")
        .eq("lab_id", activeLabId)
        .eq("user_id", claims?.sub)
        .maybeSingle(),
      supabase
        .from("lab_member_progress")
        .select("chapter_two_completed_at,chapter_three_completed_at")
        .eq("lab_id", activeLabId)
        .eq("user_id", claims?.sub)
        .maybeSingle(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", claims?.sub)
        .maybeSingle(),
      supabase
        .from("labs")
        .select("slug")
        .eq("id", activeLabId)
        .maybeSingle(),
    ]);
    if (!activeLab.error && activeLab.data?.slug) {
      activeLabSlug = String(activeLab.data.slug);
      response.cookies.set("lablog-active-lab-slug", activeLabSlug, {
        path: "/",
        maxAge: 31_536_000,
        sameSite: "lax",
      });
    }
    if (
      !membership.error &&
      ["owner", "admin", "member"].includes(
        String(membership.data?.membership_role),
      )
    ) {
      membershipRole = String(
        membership.data?.membership_role,
      ) as FeatureAccessRole;
    } else if (!platformAdmin.error && platformAdmin.data) {
      membershipRole = "admin";
    }
    if (!progress.error && progress.data) {
      const useLegacyOsData = isLegacyFeatureProgressLab(
        activeLabId,
        DEFAULT_OS_LAB_ID,
      );
      chapterTwoCompletedAt = resolvePersistedFeatureCompletion(
        progress.data.chapter_two_completed_at,
        chapterTwoCompletedAt,
        useLegacyOsData,
      );
      chapterThreeCompletedAt = resolvePersistedFeatureCompletion(
        progress.data.chapter_three_completed_at,
        chapterThreeCompletedAt,
        useLegacyOsData,
      );
    } else if (activeLabId !== DEFAULT_OS_LAB_ID) {
      chapterTwoCompletedAt = null;
      chapterThreeCompletedAt = null;
    }
  }
  const path = request.nextUrl.pathname;
  const memberPathId = path.startsWith("/members/") ? decodeURIComponent(path.split("/")[2] ?? "") : null;
  const isAuthPage = path === "/login" || path === "/signup";
  const isProtectedPage = path === "/" || path === "/admin" || path.startsWith("/admin/") || path === "/lab-tour" || path === "/labquest" || path === "/mission" || path === "/update" || path === "/feed" || path === "/calendar" || path === "/meeting" || path === "/labs" || path.startsWith("/labs/") || path.startsWith("/members/");

  if (!isAuthenticated && isProtectedPage) return NextResponse.redirect(new URL("/login", request.url));
  if (isAuthenticated && isAuthPage) return NextResponse.redirect(new URL("/labs", request.url));
  if (isAuthenticated && claims?.sub) {
    const featureRedirect = resolveAuthenticatedFeatureRedirect({
      path,
      userId: claims.sub,
      memberPathId,
      role: membershipRole,
      labSlug: activeLabSlug,
      chapterTwoCompletedAt,
      chapterThreeCompletedAt,
    });
    if (featureRedirect) {
      return NextResponse.redirect(new URL(featureRedirect, request.url));
    }
  }
  return response;
}
