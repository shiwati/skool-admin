import type { Prisma } from "@prisma/client";

/** A `History.tableName` értékei. */
export const APPLICANT_TABLE = "applicant";
export const APPLICATION_TABLE = "application";
export const EVENT_TABLE = "event";

export type HistoryTable =
	typeof APPLICANT_TABLE | typeof APPLICATION_TABLE | typeof EVENT_TABLE;

export type HistoryChange = {
	recordId: string;
	fieldName: string;
	oldValue: string | null;
	newValue: string | null;
};

/** Egy History sor adatai (`history.create`). */
export function historyRow(
	tableName: HistoryTable,
	createdById: string,
	change: HistoryChange,
	createdAt?: Date,
) {
	return {
		tableName,
		...change,
		createdById,
		...(createdAt && { createdAt }),
	};
}

/** Több History sor adatai (`history.createMany`). */
export function historyRows(
	tableName: HistoryTable,
	createdById: string,
	changes: readonly HistoryChange[],
	createdAt?: Date,
) {
	return changes.map((change) =>
		historyRow(tableName, createdById, change, createdAt),
	);
}

/** A jelentkezők és a jelentkezéseik History sorai. */
export function applicantHistoryWhere(
	applicantIds: readonly string[],
	applicationIds: readonly string[],
): Prisma.HistoryWhereInput {
	return {
		OR: [
			{ tableName: APPLICANT_TABLE, recordId: { in: [...applicantIds] } },
			...(applicationIds.length > 0
				? [
						{
							tableName: APPLICATION_TABLE,
							recordId: { in: [...applicationIds] },
						},
					]
				: []),
		],
	};
}
