/** Események listájának formázói (kliensről is importálható). */

const TIME_ZONE = "Europe/Budapest";

const ymd = new Intl.DateTimeFormat("en-CA", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** `[év, hónap, nap]` budapesti idő szerint. */
function dateParts(date: Date): [string, string, string] {
	const [y, m, d] = ymd.format(date).split("-");
	return [y, m, d];
}

/**
 * Időpont-tartomány röviden: az aktuális évben év nélkül (`11.21 – 12.12`),
 * egynapos eseménynél egy dátum (`11.16`), más évben az elején évvel
 * (`2025.07.06 – 07.10`). Évhatáron átnyúlóknál a vége is évet kap.
 */
export function formatDateRange(
	fromIso: string | Date,
	toIso: string | Date,
	now: Date,
): string {
	const [fy, fm, fd] = dateParts(new Date(fromIso));
	const [ty, tm, td] = dateParts(new Date(toIso));
	const [cy] = dateParts(now);
	const sameYear = fy === ty;
	const withYear = !sameYear || fy !== cy;
	const start = withYear ? `${fy}.${fm}.${fd}` : `${fm}.${fd}`;
	if (sameYear && fm === tm && fd === td) return start;
	const end = sameYear ? `${tm}.${td}` : `${ty}.${tm}.${td}`;
	return `${start} – ${end}`;
}

/** Hány naptári napot érint az esemény (Budapest szerint), legalább 1. */
export function eventDays(fromIso: string | Date, toIso: string | Date) {
	const day = (iso: string | Date) => {
		const [y, m, d] = dateParts(new Date(iso)).map(Number);
		return Date.UTC(y, m - 1, d) / 86_400_000;
	};
	return Math.max(1, day(toIso) - day(fromIso) + 1);
}

export function formatDuration(fromIso: string | Date, toIso: string | Date) {
	return `${eventDays(fromIso, toIso)} nap`;
}

/** Túljelentkezés aránya (jelentkezők / kapacitás); kapacitás nélkül `null`. */
export function demandRatio(applications: number, capacity: number) {
	return capacity > 0 ? applications / capacity : null;
}

/** `3,1×` – egy tizedesre, magyar tizedesvesszővel. */
export function formatRatio(ratio: number) {
	return `${ratio.toFixed(1).replace(".", ",")}×`;
}

/** Arány → badge színe (DS.2 „túljelentkezés”): ≥2× coral, ≥1× peach, alatta sage. */
export function ratioBadgeClass(ratio: number) {
	if (ratio >= 2) return "bg-coral";
	if (ratio >= 1) return "bg-peach";
	return "bg-sage";
}
