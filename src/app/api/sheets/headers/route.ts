import { z } from "zod";
import { jsonResponse } from "@/lib/api/handler";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { fetchSheet, SheetAccessError } from "@/lib/google/sheets";
import {
	getGoogleAccessToken,
	GoogleReauthRequiredError,
} from "@/lib/google/token";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ url: z.string().trim().min(1).max(2000) });

/**
 * A megadott Google Sheet első sora (a fejlécek) a bejelentkezett admin
 * Google-hozzáférésével. Az event-szerkesztő mező-megfeleltetéséhez kell.
 */
export async function POST(request: Request) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema.safeParse(body);
	const ref = parsed.success ? parseSheetUrl(parsed.data.url) : null;
	if (!ref) {
		return jsonResponse(
			{
				error: "Adj meg egy érvényes Google Sheets linket.",
				code: "SHEET_URL_INVALID",
			},
			422,
		);
	}

	try {
		const accessToken = await getGoogleAccessToken(userId);
		const sheet = await fetchSheet(ref, accessToken, { headerOnly: true });
		const headers = (sheet.rows[0] ?? [])
			.map((cell) => (cell === null ? "" : String(cell).trim()))
			.filter(Boolean);
		return jsonResponse({ headers });
	} catch (error) {
		if (error instanceof GoogleReauthRequiredError) {
			return jsonResponse(
				{
					error: "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
					code: "REAUTH_REQUIRED",
				},
				403,
			);
		}
		if (error instanceof SheetAccessError) {
			return jsonResponse(
				{ error: error.message, code: "SHEET_NOT_ACCESSIBLE" },
				422,
			);
		}
		logger.error(
			{ event: "sheet_headers.failed", userId, err: error },
			"Sheet header read failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
