import "server-only";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { fullName } from "@/lib/applicants/format";
import { db } from "@/lib/db";
import {
	APPLICATION_TABLE,
	applicantHistoryWhere,
	EVENT_TABLE,
} from "@/lib/history/write";

/** Ennyi bejegyzés jelenik meg a jelentkező adatlapjának kártyáján. */
export const HISTORY_PREVIEW_LIMIT = 5;

/** Ennyi bejegyzés jelenik meg legfeljebb a teljes változásnapló oldalon. */
export const HISTORY_PAGE_LIMIT = 200;

export type HistoryEntry = {
	id: string;
	/** A módosító neve; `null` = rendszer (vagy törölt felhasználó). */
	actor: string | null;
	field: string;
	/** Jelentkezés-bejegyzésnél a program neve. */
	programName: string | null;
	oldValue: string | null;
	newValue: string | null;
	createdAt: Date;
};

/** Az a rekord, amelynek a változástörténete egy oldalon megjelenik. */
export type HistorySubject =
	| {
			kind: "applicant";
			id: string;
			name: string;
			/** A jelentkezései, hogy az ő változásaik is bekerüljenek. */
			applications: { id: string; programName: string }[];
	  }
	| { kind: "event"; id: string; name: string };

/**
 * A `/history/[id]` oldal alanya: előbb (nem törölt) jelentkezőként, aztán
 * programként keresi az id-t. Ismeretlen vagy törölt rekordnál `null`.
 * Kérésenként memoizált (metaadat + oldal).
 */
export const getHistorySubject = cache(
	async (id: string): Promise<HistorySubject | null> => {
		const applicant = await db.applicant.findFirst({
			where: { id, deletedAt: null },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				applications: {
					select: { id: true, event: { select: { name: true } } },
				},
			},
		});
		if (applicant) {
			return {
				kind: "applicant",
				id: applicant.id,
				name: fullName(applicant),
				applications: applicant.applications.map((a) => ({
					id: a.id,
					programName: a.event.name,
				})),
			};
		}

		const event = await db.event.findUnique({
			where: { id },
			select: { id: true, name: true },
		});
		return event ? { kind: "event", ...event } : null;
	},
);

function subjectFilter(subject: HistorySubject): Prisma.HistoryWhereInput {
	if (subject.kind === "event")
		return { tableName: EVENT_TABLE, recordId: subject.id };

	return applicantHistoryWhere(
		[subject.id],
		subject.applications.map((a) => a.id),
	);
}

/**
 * Az alany változásai, legfrissebb elöl, legfeljebb `limit` darab.
 * Jelentkezőnél a jelentkezései változásai is (a program nevével).
 */
export async function getHistoryEntries(
	subject: HistorySubject,
	limit: number,
): Promise<HistoryEntry[]> {
	const programByApplication = new Map(
		subject.kind === "applicant"
			? subject.applications.map((a) => [a.id, a.programName])
			: [],
	);

	const rows = await db.history.findMany({
		where: subjectFilter(subject),
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit,
		select: {
			id: true,
			tableName: true,
			fieldName: true,
			recordId: true,
			oldValue: true,
			newValue: true,
			createdAt: true,
			createdBy: { select: { name: true } },
		},
	});

	return rows.map((row) => ({
		id: row.id,
		actor: row.createdBy?.name ?? null,
		field: row.fieldName,
		programName:
			row.tableName === APPLICATION_TABLE
				? (programByApplication.get(row.recordId) ?? null)
				: null,
		oldValue: row.oldValue,
		newValue: row.newValue,
		createdAt: row.createdAt,
	}));
}
