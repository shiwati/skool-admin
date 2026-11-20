import { jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import {
	FeedbackHeaderError,
	importFeedbackRows,
	type FeedbackImportResult,
} from "@/lib/feedback/import";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";
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

/**
 * Imports the event's feedback form sheets (`participantFeedbackSheetUrl`,
 * `mentorFeedbackSheetUrl`) with the signed-in admin's Google access. Only
 * the configured sheets are read; new responses only, safe to repeat.
 */
export async function POST(
	_request: Request,
	{ params }: RouteContext<"/api/events/[id]/feedback/sync">,
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
				participantFeedbackSheetUrl: true,
				mentorFeedbackSheetUrl: true,
			},
		});
		if (!event) return jsonResponse({ error: "Event not found" }, 404);

		const sources = (
			[
				["PARTICIPANT", event.participantFeedbackSheetUrl],
				["MENTOR", event.mentorFeedbackSheetUrl],
			] as const
		)
			.filter(([, url]) => url)
			.map(([role, url]) => ({ role, ref: parseSheetUrl(url!) }));

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
		const results: Partial<Record<FeedbackRoleKey, FeedbackImportResult>> =
			{};
		for (const { role, ref } of sources) {
			const sheet = await fetchSheet(ref!, accessToken);
			results[role] = await importFeedbackRows({
				eventId: event.id,
				role,
				rows: sheet.rows,
				timeZone: sheet.timeZone,
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
		logger.error(
			{ event: "feedback_sync.failed", userId, eventId: id, err: error },
			"Feedback sync failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
