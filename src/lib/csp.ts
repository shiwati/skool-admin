/**
 * Content-Security-Policy for HTML pages, built per request by `src/proxy.ts`
 * with a fresh nonce. Next.js reads the nonce from the request's CSP header
 * and stamps it on its own inline scripts.
 *
 * - `strict-dynamic`: scripts loaded by a nonced script are trusted too.
 * - `style-src 'unsafe-inline'`: Radix, Sonner and Recharts set inline style
 *   attributes, which a nonce cannot cover.
 * - `img-src` allows Google profile pictures (user menu avatar).
 * - `vercel.live`: the Vercel toolbar on preview deployments.
 * - `unsafe-eval` only in development (React dev tooling needs it).
 */
export function buildCsp(nonce: string, isDev: boolean): string {
	const directives: Record<string, string[]> = {
		"default-src": ["'self'"],
		"script-src": [
			"'self'",
			`'nonce-${nonce}'`,
			"'strict-dynamic'",
			"https://vercel.live",
			...(isDev ? ["'unsafe-eval'"] : []),
		],
		"style-src": ["'self'", "'unsafe-inline'", "https://vercel.live"],
		"img-src": [
			"'self'",
			"data:",
			"blob:",
			"https://*.googleusercontent.com",
			"https://vercel.live",
			"https://vercel.com",
		],
		"font-src": [
			"'self'",
			"https://vercel.live",
			"https://assets.vercel.com",
		],
		"connect-src": [
			"'self'",
			"https://vercel.live",
			"wss://ws-us3.pusher.com",
		],
		"frame-src": ["https://vercel.live"],
		"frame-ancestors": ["'none'"],
		"base-uri": ["'self'"],
		"object-src": ["'none'"],
		"form-action": ["'self'", "https://accounts.google.com"],
	};

	return Object.entries(directives)
		.map(([name, values]) => `${name} ${values.join(" ")}`)
		.join("; ");
}
