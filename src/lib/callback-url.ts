/**
 * Turns an untrusted `callbackUrl` into a same-origin path, or `fallback`.
 * Accepts app-relative paths ("/x") and absolute URLs on `baseUrl`'s origin
 * (NextAuth produces those); rejects other origins and protocol-relative
 * ("//evil") or backslash ("/\evil") tricks.
 */
export function safeCallbackPath(
	value: string | string[] | undefined,
	baseUrl: string,
	fallback = "/",
): string {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw) return fallback;

	let url: URL;
	let base: URL;
	try {
		base = new URL(baseUrl);
		url = new URL(raw, base);
	} catch {
		return fallback;
	}

	const isRelative = raw.startsWith("/") && !/^\/[/\\]/.test(raw);
	if (!isRelative && !/^https?:\/\//i.test(raw)) return fallback;
	if (url.origin !== base.origin) return fallback;

	return `${url.pathname}${url.search}${url.hash}`;
}
