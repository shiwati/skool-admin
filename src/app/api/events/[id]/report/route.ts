import { handleBody, jsonResponse, notFound } from "@/lib/api/handler";
import { logger } from "@/lib/logger";
import { reportContentSchema, selectContent } from "@/lib/reports/content";
import {
	ReportEventNotFoundError,
	saveReportContent,
} from "@/lib/reports/save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A záró riport szerkesztett tartalmának mentése. Az `(admin)` layout nem
 * védi a Route Handlereket; a session-t a `handleBody` ellenőrzi.
 */
export async function PUT(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/report">,
) {
	return handleBody(
		request,
		reportContentSchema,
		async (content, { userId }) => {
			const { id } = await params;
			await saveReportContent(id, content, userId);
			logger.info({ event: "event_report.saved", userId, eventId: id });
			return jsonResponse({ ok: true });
		},
		{
			event: "event_report.save_failed",
			select: selectContent,
			mapError: (error) =>
				error instanceof ReportEventNotFoundError
					? notFound()
					: undefined,
		},
	);
}
