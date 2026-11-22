/** Események listájának formázói (kliensről is importálható). */

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
