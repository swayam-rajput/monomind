"use server";

import { cookies } from "next/headers";

const USER_COOKIE = "monomind_user_id";

/**
 * Unique 24-char alphanumeric user identifier stored in localStorage
 * on the client but synced via cookie for server-side rendering.
 *
 * Each user gets their own UUID on first visit. This provides data
 * isolation without password-based authentication — perfect for a
 * portfolio project where ease of use trumps security.
 */
export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existingUserId = cookieStore.get(USER_COOKIE)?.value;

  if (existingUserId && existingUserId.length > 0) {
    return existingUserId;
  }

  // Generate a new UUID v4
  const newUserId = generateUuid();

  // Set cookie that lasts 1 year
  cookieStore.set(USER_COOKIE, newUserId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return newUserId;
}

function generateUuid(): string {
  // Generate a UUID v4 using crypto.randomUUID() (Node.js 18+)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Client utility to read/write userId from localStorage.
 * Import in client components to access the current userId.
 */
export function getUserIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_COOKIE);
}