import { safeCallbackPath } from "@/lib/callback-url";

/**
 * Request header set by `src/proxy.ts` with the requested page path (and
 * query), so the `(admin)` layout can use it as the post-login return URL.
 */
export const RETURN_TO_HEADER = "x-skool-return-to";

/** Only same-origin app paths are accepted; anything else falls back to "/". */
export function returnToFromHeader(value: string | null): string {
	// Any origin works here: only the relative path is kept.
	return safeCallbackPath(
		value ?? undefined,
		"http://skool-admin.local",
		"/",
	);
}
