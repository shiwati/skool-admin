/**
 * Az Áttekintés év választója: naptári év (budapesti idő) az ideitől a
 * legkorábbi programig, mindig az azt megelőző évvel összevetve.
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */
import { budapestYearRange } from "@/lib/api/query";
import { budapestYear } from "./compute";

export type DateRange = { gte: Date; lt: Date };

export type PeriodOption = { key: string; label: string };

export type Period = PeriodOption & {
	range: DateRange;
	previous: DateRange;
	/** Az összevetett év, pl. „2025”. */
	previousLabel: string;
};

/**
 * A választható évek az idei évtől (alapértelmezett) visszafelé a
 * legkorábbi program évéig (`firstYear`, a DB-ből). A tavalyi év mindig
 * szerepel, akkor is, ha még nincs régebbi program.
 */
export function periodOptions(
	now: Date,
	firstYear?: number | null,
): PeriodOption[] {
	const year = budapestYear(now);
	const oldest = Math.min(firstYear ?? year - 1, year - 1);
	return Array.from({ length: year - oldest + 1 }, (_, i) => {
		const y = year - i;
		return {
			key: String(y),
			label: i === 0 ? `${y} (idei év)` : String(y),
		};
	});
}

/** Ismeretlen vagy hiányzó kulcs esetén az idei év. */
export function resolvePeriod(
	key: string | undefined,
	now: Date,
	firstYear?: number | null,
): Period {
	const options = periodOptions(now, firstYear);
	const option = options.find((o) => o.key === key) ?? options[0];
	const year = Number(option.key);
	return {
		...option,
		range: budapestYearRange(year),
		previous: budapestYearRange(year - 1),
		previousLabel: String(year - 1),
	};
}
