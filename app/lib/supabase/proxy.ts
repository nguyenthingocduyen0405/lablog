import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type LabQuestClaims = {
  sub?: string;
  user_metadata?: { labquest_chapter2_completed_at?: unknown };
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
  const chapterTwoCompleted = typeof claims?.user_metadata?.labquest_chapter2_completed_at === "string";
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isProtectedPage = path === "/" || path === "/lab-tour" || path === "/labquest" || path === "/mission" || path === "/update" || path === "/calendar" || path === "/meeting" || path.startsWith("/members/");

  if (!isAuthenticated && isProtectedPage) return NextResponse.redirect(new URL("/login", request.url));
  if (isAuthenticated && isAuthPage) return NextResponse.redirect(new URL("/", request.url));
  if (isAuthenticated && (path === "/update" || path === "/mission") && !chapterTwoCompleted) {
    const destination = new URL("/labquest", request.url);
    destination.searchParams.set("chapter", "2");
    destination.searchParams.set("locked", path.slice(1));
    return NextResponse.redirect(destination);
  }
  return response;
}