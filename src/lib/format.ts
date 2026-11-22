/**
 * Közös megjelenítési formázók: dátum és idő budapesti időzónában, számok
 * magyar formában. Kliensről is importálható.
 */

export const TIME_ZONE = "Europe/Budapest";

/** Hiányzó érték jelölése (tábla, kártya, export). */
export const EMPTY = "—";

const ymd = new Intl.DateTimeFormat("en-CA", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const hourMinute = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

const longDate = new Intl.DateTimeFormat("hu-HU", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "long",
	day: "numeric",
});

/** A budapesti naptári nap kulcsa: `ÉÉÉÉ-HH-NN` (napok összevetéséhez). */
export function budapestDayKey(date: Date): string {
	return ymd.format(date);
}

/** `[év, hónap, nap]` budapesti idő szerint, kétjegyű hónappal és nappal. */
export function budapestDateParts(date: Date): [string, string, string] {
	const [y, m, d] = budapestDayKey(date).split("-");
	return [y, m, d];
}

/** `ÓÓ:PP` budapesti idő szerint. */
export function formatTime(date: Date): string {
	return hourMinute.format(date);
}

/** „2026. november 3.” budapesti idő szerint. */
export function formatLongDate(date: Date): string {
	return longDate.format(date);
}

function toDate(value: Date | string): Date | null {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** `ÉÉÉÉ.HH.NN` budapesti idő szerint; érvénytelen dátumra `EMPTY`. */
export function formatDate(value: Date | string): string {
	const date = toDate(value);
	if (!date) return EMPTY;
	return budapestDayKey(date).replaceAll("-", ".");
}

/** `ÉÉÉÉ.HH.NN ÓÓ:PP` budapesti idő szerint; érvénytelen dátumra `EMPTY`. */
export function formatDateTime(value: Date | string): string {
	const date = toDate(value);
	if (!date) return EMPTY;
	return `${formatDate(date)} ${formatTime(date)}`;
}

/** Teljes tartomány: `ÉÉÉÉ.HH.NN – ÉÉÉÉ.HH.NN` (pl. a jelentkező programjai). */
export function formatDateRange(
	from: Date | string,
	to: Date | string,
): string {
	return `${formatDate(from)} – ${formatDate(to)}`;
}

/**
 * Rövid tartomány évvel az elején (`2026.11.21 – 12.12`), egynapos
 * eseménynél egy dátum (`2026.11.16`). Évhatáron átnyúlóknál a vége is
 * évet kap. A programlistán és a program fejlécében.
 */
export function formatShortDateRange(
	from: Date | string,
	to: Date | string,
): string {
	const [fy, fm, fd] = budapestDateParts(new Date(from));
	const [ty, tm, td] = budapestDateParts(new Date(to));
	const sameYear = fy === ty;
	const start = `${fy}.${fm}.${fd}`;
	if (sameYear && fm === tm && fd === td) return start;
	const end = sameYear ? `${tm}.${td}` : `${ty}.${tm}.${td}`;
	return `${start} – ${end}`;
}

const countFormat = new Intl.NumberFormat("hu-HU", { useGrouping: "always" });

/** Magyar ezres tagolás nem törő szóközzel: 1248 → "1 248". */
export function formatCount(value: number): string {
	return countFormat.format(value);
}

const oneDecimal = new Intl.NumberFormat("hu-HU", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/** Egy tizedesre, tizedesvesszővel: 2.43 → "2,4". */
export function formatDecimal(value: number): string {
	return oneDecimal.format(value);
}

/** Arány szorzóként: 2.43 → "2,4×". */
export function formatRatio(ratio: number): string {
	return `${formatDecimal(ratio)}×`;
}
