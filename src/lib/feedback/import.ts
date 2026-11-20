import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SheetCell } from "@/lib/google/sheets";
import { mapFeedbackHeaders, parseFeedbackRow } from "./parse";
import type { FeedbackRoleKey, FeedbackSheetMapping } from "./questions";

export type FeedbackImportResult = {
	created: number;
	/** Korábban már importált válaszok (azonos forráskulcs). */
	existing: number;
	/** Sheet-sorszám (1-től, ahogy a Sheets mutatja) és az ok. */
	errors: { row: number; reason: string }[];
	unmappedHeaders: string[];
};

export class FeedbackHeaderError extends Error {
	constructor(
		readonly role: FeedbackRoleKey,
		readonly missing: string[],
	) {
		super("Required feedback columns are missing");
		this.name = "FeedbackHeaderError";
	}
}

/**
 * Egy visszajelző sheet új válaszait veszi fel az eseményhez. A már
 * importált sorokat (forráskulcs alapján) kihagyja, így ismételhető.
 */
export async function importFeedbackRows(options: {
	eventId: string;
	role: FeedbackRoleKey;
	rows: SheetCell[][];
	timeZone: string;
	/** Az event mentett megfeleltetése; `null` = alapértelmezett. */
	headerMapping?: FeedbackSheetMapping | null;
}): Promise<FeedbackImportResult> {
	const { eventId, role, rows, timeZone, headerMapping } = options;
	const [headers = [], ...data] = rows;
	const mapping = mapFeedbackHeaders(role, headers, headerMapping);
	if (mapping.missingRequired.length) {
		throw new FeedbackHeaderError(role, mapping.missingRequired);
	}

	const result: FeedbackImportResult = {
		created: 0,
		existing: 0,
		errors: [],
		unmappedHeaders: mapping.unmapped,
	};

	const seen = new Map<string, number>();
	const records: Prisma.FeedbackCreateManyInput[] = [];
	for (const [index, row] of data.entries()) {
		const stamp =
			mapping.timestamp === undefined
				? ""
				: String(row[mapping.timestamp] ?? "");
		const occurrence = seen.get(stamp) ?? 0;
		seen.set(stamp, occurrence + 1);

		const parsed = parseFeedbackRow(
			role,
			row,
			mapping,
			timeZone,
			occurrence,
		);
		if (parsed.ok === "empty") continue;
		if (!parsed.ok) {
			result.errors.push({ row: index + 2, reason: parsed.reason });
			continue;
		}
		records.push({
			sourceKey: parsed.sourceKey,
			submittedAt: parsed.submittedAt,
			answers: parsed.answers,
			overallScore: parsed.overallScore,
			recommend: parsed.recommend,
			searchText: parsed.searchText,
			eventId,
			role,
		});
	}

	if (records.length > 0) {
		const { count } = await db.feedback.createMany({
			data: records,
			skipDuplicates: true,
		});
		result.created = count;
	}
	result.existing = records.length - result.created;
	return result;
}
