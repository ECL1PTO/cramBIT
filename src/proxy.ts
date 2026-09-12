import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/pay") ||
    pathname.startsWith("/admin");

  if (protectedPath && !user) {
    const url = request.nextUrl.clone();
    const dest = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    if (dest !== "/dashboard") url.searchParams.set("next", dest);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next.split("?")[0] : "/dashboard";
    url.search = next && next.includes("?") ? "?" + next.split("?")[1] : "";
    return NextResponse.redirect(url);
  }

  // /admin is additionally gated inside the page (is_admin check).
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
