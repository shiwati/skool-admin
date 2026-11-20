import "server-only";
import { db } from "@/lib/db";
import { EVENT_TABLE } from "@/lib/events/changes";
import { createGoogleDocFromHtml } from "@/lib/google/drive";
import {
	getGoogleAccessToken,
	GOOGLE_DRIVE_FILE_SCOPE,
} from "@/lib/google/token";
import type { ReportContent } from "./content";
import { getEventReport, toDocumentData } from "./load";
import { renderReportHtml, reportFileName } from "./render";

/** History `fieldName` a generált dokumentumhoz (`tableName: "event"`). */
export const REPORT_DOCUMENT_HISTORY_FIELD = "reportDocument";

export class ReportEventNotFoundError extends Error {
	constructor() {
		super("Event not found");
		this.name = "ReportEventNotFoundError";
	}
}

export async function saveReportContent(
	eventId: string,
	content: ReportContent,
	userId: string,
): Promise<void> {
	const exists = await db.event.findUnique({
		where: { id: eventId },
		select: { id: true },
	});
	if (!exists) throw new ReportEventNotFoundError();
	await db.eventReport.upsert({
		where: { eventId },
		create: { eventId, content, updatedById: userId },
		update: { content, updatedById: userId },
	});
}

/**
 * Elmenti a tartalmat, majd mindig új Google Docot hoz létre az admin saját
 * Drive-jában, és naplózza (EventReportDocument + History).
 */
export async function generateReportDocument(
	eventId: string,
	content: ReportContent,
	userId: string,
) {
	await saveReportContent(eventId, content, userId);
	const report = await getEventReport(eventId);
	if (!report) throw new ReportEventNotFoundError();

	const data = toDocumentData(report, content);
	const title = reportFileName(data);
	const accessToken = await getGoogleAccessToken(
		userId,
		GOOGLE_DRIVE_FILE_SCOPE,
	);
	const doc = await createGoogleDocFromHtml(
		title,
		renderReportHtml(data),
		accessToken,
	);

	return db.$transaction(async (tx) => {
		const created = await tx.eventReportDocument.create({
			data: {
				eventId,
				docId: doc.id,
				docUrl: doc.url,
				title,
				createdById: userId,
			},
			select: { id: true, title: true, docUrl: true, createdAt: true },
		});
		await tx.history.create({
			data: {
				tableName: EVENT_TABLE,
				recordId: eventId,
				fieldName: REPORT_DOCUMENT_HISTORY_FIELD,
				oldValue: null,
				newValue: title,
				createdById: userId,
			},
		});
		return created;
	});
}
