import { NextResponse, type NextRequest } from "next/server";
import { RETURN_TO_HEADER } from "@/lib/return-to";

/**
 * Layouts cannot read the current URL, but the `(admin)` layout's sign-in
 * redirect needs it as the post-login return URL. This only forwards the
 * path; it makes no access decision (the layout still checks the session).
 */
export function proxy(request: NextRequest) {
	const headers = new Headers(request.headers);
	headers.set(
		RETURN_TO_HEADER,
		`${request.nextUrl.pathname}${request.nextUrl.search}`,
	);
	return NextResponse.next({ request: { headers } });
}

export const config = {
	// Pages only: not API routes, Next.js assets, static files or the login page.
	matcher: ["/((?!api/|_next/|login|brand/|favicon\\.ico).*)"],
};
