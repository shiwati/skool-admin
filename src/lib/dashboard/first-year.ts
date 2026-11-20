import "server-only";
import { db } from "@/lib/db";
import { budapestYear } from "./compute";

export type EventYearBounds = { first: number | null; last: number | null };

/** A legkorábbi és legkésőbbi program kezdésének éve (budapesti idő); `null`, ha nincs program. */
export async function eventYearBounds(): Promise<EventYearBounds> {
	const { _min, _max } = await db.event.aggregate({
		_min: { from: true },
		_max: { from: true },
	});
	return {
		first: _min.from ? budapestYear(_min.from) : null,
		last: _max.from ? budapestYear(_max.from) : null,
	};
}

/** A legkorábbi program kezdésének éve; `null`, ha nincs program. */
export async function firstEventYear(): Promise<number | null> {
	return (await eventYearBounds()).first;
}
