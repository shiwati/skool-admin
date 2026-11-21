import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { RETURN_TO_HEADER } from "@/lib/return-to";

/**
 * For every page request:
 * - sets a per-request nonce-based Content-Security-Policy (request header so
 *   Next.js nonces its inline scripts, response header for the browser);
 * - forwards the requested path for the `(admin)` layout's post-login return
 *   URL (layouts cannot read the current URL). This makes no access decision:
 *   the layout still checks the session.
 */
export function proxy(request: NextRequest) {
	const nonce = btoa(crypto.randomUUID());
	const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

	const headers = new Headers(request.headers);
	headers.set("x-nonce", nonce);
	headers.set("Content-Security-Policy", csp);
	headers.set(
		RETURN_TO_HEADER,
		`${request.nextUrl.pathname}${request.nextUrl.search}`,
	);

	const response = NextResponse.next({ request: { headers } });
	response.headers.set("Content-Security-Policy", csp);
	return response;
}

export const config = {
	// Pages only: not API routes, Next.js assets or static files. Prefetches
	// are skipped so they don't get a nonce that differs from the page's.
	matcher: [
		{
			source: "/((?!api/|_next/static|_next/image|brand/|favicon\\.ico).*)",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
};
