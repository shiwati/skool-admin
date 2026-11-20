import { jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { fetchSheet, SheetAccessError } from "@/lib/google/sheets";
import {
	getGoogleAccessToken,
	GoogleReauthRequiredError,
} from "@/lib/google/token";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { readApplicationMapping } from "@/lib/sheet-mapping/schema";
import { importSheetRows, SheetHeaderError } from "@/lib/sheet-import/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Imports the event's Google Form response sheet (`Event.applicationSheetUrl`) with the
 * signed-in admin's Google access. New responses only; safe to repeat.
 */
export async function POST(
	_request: Request,
	{ params }: RouteContext<"/api/events/[id]/sync">,
) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	const { id } = await params;

	try {
		const event = await db.event.findUnique({
			where: { id },
			select: {
				id: true,
				applicationSheetUrl: true,
				applicationSheetMapping: true,
			},
		});
		if (!event) return jsonResponse({ error: "Event not found" }, 404);

		const ref = event.applicationSheetUrl
			? parseSheetUrl(event.applicationSheetUrl)
			: null;
		if (!ref) {
			return jsonResponse(
				{
					error: "Az eseményhez nincs érvényes Google Sheet link megadva.",
					code: "SHEET_URL_INVALID",
				},
				422,
			);
		}

		const accessToken = await getGoogleAccessToken(userId);
		const sheet = await fetchSheet(ref, accessToken);
		const result = await importSheetRows({
			eventId: event.id,
			rows: sheet.rows,
			timeZone: sheet.timeZone,
			userId,
			headerMapping: readApplicationMapping(
				event.applicationSheetMapping,
			),
		});

		logger.info({
			event: "sheet_sync.completed",
			userId,
			eventId: event.id,
			created: result.created,
			existing: result.existing,
			duplicates: result.duplicates,
			errors: result.errors.length,
		});
		return jsonResponse(result);
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
		if (error instanceof SheetHeaderError) {
			return jsonResponse(
				{
					error: "A sheetből hiányoznak kötelező oszlopok.",
					code: "SHEET_HEADERS_MISSING",
					missing: error.missing,
				},
				422,
			);
		}
		logger.error(
			{ event: "sheet_sync.failed", userId, eventId: id, err: error },
			"Sheet sync failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
