/** Kliensről és szerverről is importálható (nincs benne `server-only` és Prisma). */

/**
 * Választható évek csökkenő sorrendben: a legkésőbbi program évétől (akár
 * jövőbeli) a legkorábbiig. Az idei év mindig szerepel, akkor is, ha még
 * nincs program. Az évhatárokat a szerver adja (`loadProgramYears`).
 */
export function programYears(
	bounds: { first: number | null; last: number | null },
	now = new Date(),
): number[] {
	const current = now.getFullYear();
	const newest = Math.max(bounds.last ?? current, current);
	const oldest = Math.min(bounds.first ?? current, current);
	return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i);
}
