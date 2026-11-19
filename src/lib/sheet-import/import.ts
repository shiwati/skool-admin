import "server-only";
import { db } from "@/lib/db";
import type { SheetCell } from "@/lib/google/sheets";
import {
	duplicateKey,
	mapHeaders,
	parseRow,
	type HeaderMapping,
} from "./mapping";

export type ImportResult = {
	created: number;
	/** Rows already imported earlier (same source key in this event). */
	existing: number;
	/** Newly created applicants that match an existing one (name + email). */
	duplicates: number;
	/** Sheet row numbers (1-based, as shown in Sheets) with the reason. */
	errors: { row: number; reason: string }[];
	unmappedHeaders: string[];
};

export class SheetHeaderError extends Error {
	constructor(readonly missing: HeaderMapping["missingRequired"]) {
		super("Required columns are missing");
		this.name = "SheetHeaderError";
	}
}

/**
 * Imports form responses into an event. Every new response creates its own
 * applicant; when another applicant has the same name and email, all of them
 * are flagged (`duplicateFlag`) for the admin to merge. Rows are tracked by
 * `sourceKey`, so re-running the sync never imports a response twice and
 * never overwrites admin edits.
 */
export async function importSheetRows(options: {
	eventId: string;
	rows: SheetCell[][];
	timeZone: string;
	userId: string;
}): Promise<ImportResult> {
	const { eventId, rows, timeZone, userId } = options;
	const [headers = [], ...data] = rows;
	const mapping = mapHeaders(headers);
	if (mapping.missingRequired.length) {
		throw new SheetHeaderError(mapping.missingRequired);
	}

	const result: ImportResult = {
		created: 0,
		existing: 0,
		duplicates: 0,
		errors: [],
		unmappedHeaders: mapping.unmapped,
	};

	for (const [index, row] of data.entries()) {
		const rowNumber = index + 2;
		const parsed = parseRow(row, mapping.columns, timeZone);
		if (parsed.ok === "empty") continue;
		if (!parsed.ok) {
			result.errors.push({ row: rowNumber, reason: parsed.reason });
			continue;
		}

		const { applicant, application, sourceKey } = parsed;
		const outcome = await db.$transaction(async (tx) => {
			const imported = await tx.application.findUnique({
				where: { eventId_sourceKey: { eventId, sourceKey } },
				select: { id: true },
			});
			if (imported) return "existing" as const;

			const key = duplicateKey(
				applicant.lastName,
				applicant.firstName,
				applicant.email,
			);
			const hasDuplicate =
				(await tx.applicant.count({ where: { duplicateKey: key } })) >
				0;
			if (hasDuplicate) {
				await tx.applicant.updateMany({
					where: { duplicateKey: key, duplicateFlag: false },
					data: { duplicateFlag: true },
				});
			}

			const created = await tx.applicant.create({
				data: {
					...applicant,
					duplicateKey: key,
					duplicateFlag: hasDuplicate,
					updatedById: userId,
				},
				select: { id: true },
			});
			await tx.application.create({
				data: {
					...application,
					receivedAt: application.receivedAt ?? undefined,
					sourceKey,
					eventId,
					applicantId: created.id,
					updatedById: userId,
				},
			});
			return hasDuplicate ? ("duplicate" as const) : ("created" as const);
		});

		if (outcome === "existing") {
			result.existing += 1;
		} else {
			result.created += 1;
			if (outcome === "duplicate") result.duplicates += 1;
		}
	}

	return result;
}
