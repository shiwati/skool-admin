import "server-only";
import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth";

/**
 * Returns the current admin session, or `null` when signed out. Only Skool
 * Workspace accounts can create sessions, so a valid session is sufficient.
 *
 * Route Handlers and Server Actions are NOT protected by the `(admin)` layout:
 * call this in each one and reject the request when it returns `null`.
 *
 * Memoised per request, so a layout and its page share one database read.
 */
export const getAdminSession = cache(async (): Promise<Session | null> =>
	getServerSession(authOptions),
);

/**
 * For pages: returns the session, or redirects to `/login` with `returnTo` as
 * the post-sign-in return URL.
 */
export async function requireAdmin(returnTo: string): Promise<Session> {
	const session = await getAdminSession();
	if (!session) {
		redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
	}
	return session;
}
