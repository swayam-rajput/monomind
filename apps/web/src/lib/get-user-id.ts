import { cookies } from "next/headers";

/**
 * Get the current user's ID from the cookie.
 * Works in Server Components and API Routes (where cookies() is available).
 */
export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value;

  // Fallback to legacy user ID if cookie missing (shouldn't happen with middleware)
  return userId ?? "00000000-0000-0000-0000-000000000000";
}