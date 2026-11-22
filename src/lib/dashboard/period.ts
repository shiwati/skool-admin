/**
 * Az Áttekintés év választója: „Összes év” (alapértelmezett), vagy naptári év
 * (budapesti idő) az ideitől a legkorábbi programig, az azt megelőző évvel
 * összevetve.
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */
import { budapestYearRange } from "@/lib/api/query";
import { budapestYear } from "./compute";

export type DateRange = { gte: Date; lt: Date };

export type Period = {
	year: number;
	range: DateRange;
	previous: DateRange;
};

/** Az évszűrő felirata, amikor nincs év kiválasztva. */
export const ALL_YEARS_LABEL = "Összes év";

/**
 * A választható évek az idei évtől visszafelé a legkorábbi program évéig
 * (`firstYear`, a DB-ből). A tavalyi év mindig szerepel, akkor is, ha még nincs
 * régebbi program.
 */
export function periodYears(now: Date, firstYear?: number | null): number[] {
	const year = budapestYear(now);
	const oldest = Math.min(firstYear ?? year - 1, year - 1);
	return Array.from({ length: year - oldest + 1 }, (_, i) => year - i);
}

/**
 * A választható évek közül a megadott; ismeretlen vagy hiányzó érték esetén
 * `null`, vagyis az összes év.
 */
export function resolvePeriod(
	value: string | undefined,
	now: Date,
	firstYear?: number | null,
): Period | null {
	const year = periodYears(now, firstYear).find((y) => String(y) === value);
	if (year === undefined) return null;
	return {
		year,
		range: budapestYearRange(year),
		previous: budapestYearRange(year - 1),
	};
}
