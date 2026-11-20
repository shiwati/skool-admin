import { jsonResponse } from "@/lib/api/handler";
import { DriveApiDisabledError } from "@/lib/google/drive";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { logger } from "@/lib/logger";
import { reportContentSchema } from "@/lib/reports/content";
import {
	generateReportDocument,
	ReportEventNotFoundError,
} from "@/lib/reports/save";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Elmenti a riport tartalmát, és új Google Docot generál belőle a
 * bejelentkezett admin saját Drive-jába. Minden hívás új dokumentum.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/report/documents">,
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
		const doc = await generateReportDocument(id, parsed.data, userId);
		logger.info({ event: "event_report.generated", userId, eventId: id });
		return jsonResponse(
			{
				id: doc.id,
				title: doc.title,
				docUrl: doc.docUrl,
				createdAt: doc.createdAt.toISOString(),
			},
			201,
		);
	} catch (error) {
		if (error instanceof ReportEventNotFoundError) {
			return jsonResponse({ error: "Not Found" }, 404);
		}
		if (error instanceof DriveApiDisabledError) {
			logger.error({
				event: "event_report.drive_api_disabled",
				eventId: id,
			});
			return jsonResponse(
				{
					error: "A Google Drive API nincs engedélyezve az app Google Cloud projektjében. Szólj a rendszergazdának.",
					code: "DRIVE_API_DISABLED",
				},
				503,
			);
		}
		if (error instanceof GoogleReauthRequiredError) {
			return jsonResponse(
				{
					error: "Jelentkezz be újra Google-lel, hogy a rendszer Google Docot hozhasson létre a Drive-odban.",
					code: "REAUTH_REQUIRED",
				},
				403,
			);
		}
		logger.error(
			{ event: "event_report.generate_failed", eventId: id, err: error },
			"Report generation failed",
		);
		return jsonResponse(
			{ error: "A Google Doc nem készült el. Próbáld újra." },
			502,
		);
	}
}
