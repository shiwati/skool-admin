import "server-only";
import { db } from "@/lib/db";
import { budapestYear } from "./compute";

/** A legkorábbi program kezdésének éve (budapesti idő); `null`, ha nincs program. */
export async function firstEventYear(): Promise<number | null> {
	const { _min } = await db.event.aggregate({ _min: { from: true } });
	return _min.from ? budapestYear(_min.from) : null;
}
