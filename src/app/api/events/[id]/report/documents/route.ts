import { googleErrorResponse } from "@/lib/api/google-errors";
import { handleBody, jsonResponse, notFound } from "@/lib/api/handler";
import {
	DocsApiDisabledError,
	ReportTemplateNotAccessibleError,
} from "@/lib/google/docs";
import { DriveApiDisabledError } from "@/lib/google/drive";
import { logger } from "@/lib/logger";
import { reportContentSchema, selectContent } from "@/lib/reports/content";
import {
	generateReportDocument,
	ReportEventNotFoundError,
} from "@/lib/reports/save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCS_REAUTH_MESSAGE =
	"Jelentkezz be újra Google-lel, hogy a rendszer Google Docot hozhasson létre a Drive-odban.";

/**
 * Elmenti a riport tartalmát, és új Google Docot generál belőle a
 * bejelentkezett admin saját Drive-jába. Minden hívás új dokumentum.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/report/documents">,
) {
	const { id } = await params;
	return handleBody(
		request,
		reportContentSchema,
		async (content, { userId }) => {
			const doc = await generateReportDocument(id, content, userId);
			logger.info({
				event: "event_report.generated",
				userId,
				eventId: id,
			});
			return jsonResponse(
				{
					id: doc.id,
					title: doc.title,
					docUrl: doc.docUrl,
					createdAt: doc.createdAt.toISOString(),
				},
				201,
			);
		},
		{
			event: "event_report.generate_failed",
			select: selectContent,
			mapError: (error) => {
				if (error instanceof ReportEventNotFoundError)
					return notFound();
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
				if (error instanceof DocsApiDisabledError) {
					logger.error({
						event: "event_report.docs_api_disabled",
						eventId: id,
					});
					return jsonResponse(
						{
							error: "A Google Docs API nincs engedélyezve az app Google Cloud projektjében. Szólj a rendszergazdának.",
							code: "DOCS_API_DISABLED",
						},
						503,
					);
				}
				if (error instanceof ReportTemplateNotAccessibleError) {
					logger.error({
						event: "event_report.template_not_accessible",
						eventId: id,
					});
					return jsonResponse(
						{
							error: "A riport-sablon nem érhető el. Ellenőrizd, hogy meg van-e osztva a domainnel.",
							code: "TEMPLATE_NOT_ACCESSIBLE",
						},
						422,
					);
				}
				return googleErrorResponse(error, DOCS_REAUTH_MESSAGE);
			},
			failure: () =>
				jsonResponse(
					{ error: "A Google Doc nem készült el. Próbáld újra." },
					502,
				),
		},
	);
}
