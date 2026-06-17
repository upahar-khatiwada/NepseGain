import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({ headers: request.headers });

  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(
      new URL(session ? "/dashboard" : "/sign-in", request.url),
    );
  }

  if (!session) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
