import { z } from "zod";

/**
 * Az eseményeken használható címkék fix listája. Ez az egyetlen forrás:
 * az API-szűrő, a seed és a felület is innen dolgozik. Bővítése
 * kódmódosítás; címke eltávolítása előtt a meglévő adatot rendezni kell.
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */
export const EVENT_TAGS = [
	"robotika",
	"programozás",
	"kezdő",
	"haladó",
] as const;

export type EventTag = (typeof EVENT_TAGS)[number];

export const eventTagSchema = z.enum(EVENT_TAGS);

export function isEventTag(value: unknown): value is EventTag {
	return eventTagSchema.safeParse(value).success;
}
