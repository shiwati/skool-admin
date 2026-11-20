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
 * Időpont-tartomány évvel az elején (`2026.11.21 – 12.12`), egynapos
 * eseménynél egy dátum (`2026.11.16`). Évhatáron átnyúlóknál a vége is
 * évet kap.
 */
export function formatDateRange(
	fromIso: string | Date,
	toIso: string | Date,
): string {
	const [fy, fm, fd] = dateParts(new Date(fromIso));
	const [ty, tm, td] = dateParts(new Date(toIso));
	const sameYear = fy === ty;
	const start = `${fy}.${fm}.${fd}`;
	if (sameYear && fm === tm && fd === td) return start;
	const end = sameYear ? `${tm}.${td}` : `${ty}.${tm}.${td}`;
	return `${start} – ${end}`;
}

/** `12-18` → `12–18 év`; ismeretlen alakú szöveg változatlanul marad. */
export function formatAgeRange(ageRange: string): string {
	const match = /^(\d{1,2})-(\d{1,2})$/.exec(ageRange.trim());
	return match ? `${match[1]}–${match[2]} év` : ageRange;
}

export type EventPerson = { name: string; role: "oktató" | "mentor" };

/** Az oktató és a mentorok egy listában (üres nevek nélkül), az oktató elöl. */
export function eventPeople(
	instructor: string | null,
	mentors: string[],
): EventPerson[] {
	return [
		...(instructor ? [{ name: instructor, role: "oktató" as const }] : []),
		...mentors.map((name) => ({ name, role: "mentor" as const })),
	].filter((person) => person.name.trim() !== "");
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
	return "bg-sky";
}

/** A telítettségi sáv színe: mint a badge, de 1× alatt kék (sky) a zöld helyett. */
export function ratioBarClass(ratio: number) {
	return ratio < 1 ? "bg-sky" : ratioBadgeClass(ratio);
}
