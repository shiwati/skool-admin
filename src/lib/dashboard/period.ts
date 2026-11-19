/**
 * Az Áttekintés év választója: idei vagy tavalyi naptári év (budapesti idő),
 * mindig az azt megelőző évvel összevetve.
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

/** A választható évek: idei (alapértelmezett) és tavalyi. */
export function periodOptions(now: Date): PeriodOption[] {
	const year = budapestYear(now);
	return [
		{ key: String(year), label: `${year} (idei év)` },
		{ key: String(year - 1), label: String(year - 1) },
	];
}

/** Ismeretlen vagy hiányzó kulcs esetén az idei év. */
export function resolvePeriod(key: string | undefined, now: Date): Period {
	const options = periodOptions(now);
	const option = options.find((o) => o.key === key) ?? options[0];
	const year = Number(option.key);
	return {
		...option,
		range: budapestYearRange(year),
		previous: budapestYearRange(year - 1),
		previousLabel: String(year - 1),
	};
}
