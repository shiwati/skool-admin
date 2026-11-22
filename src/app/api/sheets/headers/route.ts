import { z } from "zod";
import { googleErrorResponse } from "@/lib/api/google-errors";
import {
	handleAdmin,
	invalidBody,
	jsonResponse,
	readJson,
} from "@/lib/api/handler";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { fetchSheet } from "@/lib/google/sheets";
import { getGoogleAccessToken } from "@/lib/google/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ url: z.string().trim().min(1).max(2000) });

/**
 * A megadott Google Sheet első sora (a fejlécek) a bejelentkezett admin
 * Google-hozzáférésével. Az event-szerkesztő mező-megfeleltetéséhez kell.
 */
export async function POST(request: Request) {
	return handleAdmin(
		request,
		async ({ userId }) => {
			const json = await readJson(request);
			if (!json.ok) return invalidBody();
			const parsed = bodySchema.safeParse(json.body);
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

			const accessToken = await getGoogleAccessToken(userId);
			const sheet = await fetchSheet(ref, accessToken, {
				headerOnly: true,
			});
			const headers = (sheet.rows[0] ?? [])
				.map((cell) => (cell === null ? "" : String(cell).trim()))
				.filter(Boolean);
			return jsonResponse({ headers });
		},
		{ event: "sheet_headers.failed", mapError: googleErrorResponse },
	);
}
