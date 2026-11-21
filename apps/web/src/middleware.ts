import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USER_COOKIE = "monomind_user_id";

/**
 * Middleware that ensures every request has a userId cookie.
 * If not present, generates a UUID and sets it as a cookie.
 * This enables multi-user data isolation without requiring login.
 */
export async function middleware(request: NextRequest) {
  const userId = request.cookies.get(USER_COOKIE)?.value;

  const response = NextResponse.next();

  if (!userId) {
    const newUserId = generateUuid();
    response.cookies.set(USER_COOKIE, newUserId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

function generateUuid(): string {
  // Simple UUID v4 generation (works in edge runtime)
  const array = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older environments
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  // Set version (4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5"
    );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - they handle their own userId via lib/user.ts)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};