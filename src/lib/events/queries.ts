import "server-only";
import { db } from "@/lib/db";
import { EVENT_SEARCH_OMIT } from "@/lib/search-columns";

/** Egy program adatai; `null`, ha nincs ilyen. A route és a szerkesztő oldal is ezt használja. */
export function getEvent(id: string) {
	return db.event.findUnique({ where: { id }, omit: EVENT_SEARCH_OMIT });
}
