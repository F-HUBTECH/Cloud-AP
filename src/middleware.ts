import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/dashboard";
const PUBLIC_PATHS = [LOGIN_PATH, "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options ?? {});
          });
        },
      },
    },
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isLoginPath = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

  if (!authUser) {
    if (isPublicPath) {
      return response;
    }
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPath) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  const { data: appUser, error } = await supabase
    .from("app_users")
    .select("is_active")
    .eq("auth_uid", authUser.id)
    .single();

  if (error || !appUser) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("error", "account_not_found");
    return NextResponse.redirect(loginUrl);
  }

  if (!appUser.is_active) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};