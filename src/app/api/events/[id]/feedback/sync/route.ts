import { googleErrorResponse } from "@/lib/api/google-errors";
import { handleAdmin, jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import {
	FeedbackHeaderError,
	importFeedbackRows,
	type FeedbackImportResult,
} from "@/lib/feedback/import";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { fetchSheet } from "@/lib/google/sheets";
import { getGoogleAccessToken } from "@/lib/google/token";
import { logger } from "@/lib/logger";
import { readFeedbackMapping } from "@/lib/sheet-mapping/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Imports the event's feedback form sheets (`participantFeedbackSheetUrl`,
 * `mentorFeedbackSheetUrl`) with the signed-in admin's Google access. Only
 * the configured sheets are read; new responses only, safe to repeat.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/feedback/sync">,
) {
	return handleAdmin(
		request,
		async ({ userId }) => {
			const { id } = await params;
			const event = await db.event.findUnique({
				where: { id },
				select: {
					id: true,
					participantFeedbackSheetUrl: true,
					mentorFeedbackSheetUrl: true,
					participantFeedbackSheetMapping: true,
					mentorFeedbackSheetMapping: true,
				},
			});
			if (!event) return jsonResponse({ error: "Event not found" }, 404);

			const sources = (
				[
					[
						"PARTICIPANT",
						event.participantFeedbackSheetUrl,
						event.participantFeedbackSheetMapping,
					],
					[
						"MENTOR",
						event.mentorFeedbackSheetUrl,
						event.mentorFeedbackSheetMapping,
					],
				] as const
			)
				.filter(([, url]) => url)
				.map(([role, url, mapping]) => ({
					role,
					ref: parseSheetUrl(url!),
					headerMapping: readFeedbackMapping(role, mapping),
				}));

			if (sources.length === 0 || sources.some(({ ref }) => !ref)) {
				return jsonResponse(
					{
						error: "Az eseményhez nincs érvényes visszajelző Google Sheet link megadva.",
						code: "SHEET_URL_INVALID",
					},
					422,
				);
			}

			const accessToken = await getGoogleAccessToken(userId);
			const results: Partial<
				Record<FeedbackRoleKey, FeedbackImportResult>
			> = {};
			for (const { role, ref, headerMapping } of sources) {
				const sheet = await fetchSheet(ref!, accessToken);
				results[role] = await importFeedbackRows({
					eventId: event.id,
					role,
					rows: sheet.rows,
					timeZone: sheet.timeZone,
					headerMapping,
				});
			}

			logger.info({
				event: "feedback_sync.completed",
				userId,
				eventId: event.id,
				participantCreated: results.PARTICIPANT?.created,
				mentorCreated: results.MENTOR?.created,
			});
			return jsonResponse(results);
		},
		{
			event: "feedback_sync.failed",
			mapError: (error) => {
				if (error instanceof FeedbackHeaderError) {
					return jsonResponse(
						{
							error: `A ${ROLE_LABELS[error.role].toLowerCase()}i visszajelző sheetből hiányoznak kötelező oszlopok: ${error.missing.join(", ")}.`,
							code: "SHEET_HEADERS_MISSING",
							role: error.role,
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
