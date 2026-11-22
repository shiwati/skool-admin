import "server-only";
import type { Event } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import { EVENT_TABLE } from "@/lib/history/write";
import { emptyCounts, type StatusCounts } from "./list";

/** Ennyi változás jelenik meg az áttekintésen. */
export const OVERVIEW_HISTORY_LIMIT = 5;

export type EventHistoryEntry = {
	id: string;
	/** A módosító neve; `null` = rendszer (vagy törölt felhasználó). */
	actor: string | null;
	field: string;
	oldValue: string | null;
	newValue: string | null;
	createdAt: Date;
};

export type EventOverview = {
	event: Event;
	counts: StatusCounts;
	/** Legfrissebb elöl, legfeljebb `OVERVIEW_HISTORY_LIMIT`. */
	history: EventHistoryEntry[];
};

/**
 * Egy program áttekintő adatai; ismeretlen id-nél `null`. Kérésenként
 * memoizált, így a layout, az oldal és a `generateMetadata` egy
 * lekérdezéssort használ.
 */
export const getEventOverview = cache(
	async (id: string): Promise<EventOverview | null> => {
		const event = await db.event.findUnique({ where: { id } });
		if (!event) return null;

		const [grouped, rows] = await Promise.all([
			db.application.groupBy({
				by: ["status"],
				where: { eventId: id },
				_count: { _all: true },
			}),
			db.history.findMany({
				where: { tableName: EVENT_TABLE, recordId: id },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: OVERVIEW_HISTORY_LIMIT,
				select: {
					id: true,
					fieldName: true,
					oldValue: true,
					newValue: true,
					createdAt: true,
					createdBy: { select: { name: true } },
				},
			}),
		]);

		const counts = emptyCounts();
		for (const row of grouped) {
			counts[row.status] = row._count._all;
			counts.total += row._count._all;
		}

		return {
			event,
			counts,
			history: rows.map((row) => ({
				id: row.id,
				actor: row.createdBy?.name ?? null,
				field: row.fieldName,
				oldValue: row.oldValue,
				newValue: row.newValue,
				createdAt: row.createdAt,
			})),
		};
	},
);
