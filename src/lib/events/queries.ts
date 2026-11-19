import "server-only";
import { db } from "@/lib/db";

/** Egy program adatai; `null`, ha nincs ilyen. A route és a szerkesztő oldal is ezt használja. */
export function getEvent(id: string) {
	return db.event.findUnique({ where: { id } });
}
