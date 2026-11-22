import { googleErrorResponse } from "@/lib/api/google-errors";
import { handleAdmin, jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { fetchSheet } from "@/lib/google/sheets";
import { getGoogleAccessToken } from "@/lib/google/token";
import { logger } from "@/lib/logger";
import { readApplicationMapping } from "@/lib/sheet-mapping/schema";
import { importSheetRows, SheetHeaderError } from "@/lib/sheet-import/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Imports the event's Google Form response sheet (`Event.applicationSheetUrl`) with the
 * signed-in admin's Google access. New responses only; safe to repeat.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/sync">,
) {
	return handleAdmin(
		request,
		async ({ userId }) => {
			const { id } = await params;
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
		},
		{
			event: "sheet_sync.failed",
			mapError: (error) => {
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
				return googleErrorResponse(error);
			},
		},
	);
}
