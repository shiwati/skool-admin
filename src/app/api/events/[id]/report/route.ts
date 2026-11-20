import { jsonResponse } from "@/lib/api/handler";
import { logger } from "@/lib/logger";
import { reportContentSchema } from "@/lib/reports/content";
import {
	ReportEventNotFoundError,
	saveReportContent,
} from "@/lib/reports/save";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A záró riport szerkesztett tartalmának mentése. Az `(admin)` layout nem
 * védi a Route Handlereket, ezért a session-t itt ellenőrizzük.
 */
export async function PUT(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/report">,
) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid request body" }, 400);
	}
	const parsed = reportContentSchema.safeParse(
		(body as { content?: unknown } | null)?.content,
	);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	const { id } = await params;
	try {
		await saveReportContent(id, parsed.data, userId);
		logger.info({ event: "event_report.saved", userId, eventId: id });
		return jsonResponse({ ok: true });
	} catch (error) {
		if (error instanceof ReportEventNotFoundError) {
			return jsonResponse({ error: "Not Found" }, 404);
		}
		logger.error(
			{ event: "event_report.save_failed", eventId: id, err: error },
			"Report save failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
