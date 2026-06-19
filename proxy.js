import { NextResponse } from "next/server";

const COOKIE_NAME = "token"; // ← verify this matches your DevTools cookie name
const API_BASE = "http://localhost:8080";
const PROTECTED_ROUTES = ["/dashboard", "/admin"];
const AUTH_ROUTE = "/auth";

export async function proxy(request) {
    const { pathname } = request.nextUrl;

    // ─── Bonus: redirect already-logged-in users away from /auth ───
    if (pathname.startsWith(AUTH_ROUTE)) {
        const cookie = request.cookies.get(COOKIE_NAME);
        if (cookie) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // ─── Step 1: cheap check — no cookie at all → redirect immediately ───
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
        return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
    }

    // ─── Step 2: real check — validate token with the backend ───
    let user;
    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            headers: {
                // Forward the httpOnly cookie to the backend manually
                cookie: `${COOKIE_NAME}=${cookie.value}`,
            },
        });

        if (!res.ok) {
            return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
        }

        user = await res.json();
    } catch {
        return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
    }

    // ─── Step 3: role check — /admin is ADMIN only ───
    if (pathname.startsWith("/admin") && user?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*", "/auth"],
};