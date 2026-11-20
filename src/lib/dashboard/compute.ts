/**
 * Az Áttekintés (dashboard) számításai. Tiszta függvények: a lekérdezés a
 * `load.ts`-ben van, itt csak a már betöltött adatok összesítése.
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */

import type { ApplicationStatus } from "@/lib/applicants/types";

const TIME_ZONE = "Europe/Budapest";

export type StatusBreakdown = Partial<Record<ApplicationStatus, number>>;

/** Egy program a dashboard szemszögéből: kapacitás és beérkezett jelentkezések. */
export type EventStat = {
	id: string;
	name: string;
	from: Date;
	to: Date;
	capacity: number;
	applications: number;
	/** Jelentkezések státusz szerint; hiányzó státusz = 0. */
	byStatus?: StatusBreakdown;
};

const ymParts = new Intl.DateTimeFormat("en-CA", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "2-digit",
});

/** Naptári év és hónap (1–12) budapesti idő szerint. */
export function budapestYearMonth(date: Date): { year: number; month: number } {
	const parts = ymParts.formatToParts(date);
	const get = (type: string) =>
		Number(parts.find((p) => p.type === type)?.value);
	return { year: get("year"), month: get("month") };
}

export function budapestYear(date: Date): number {
	return budapestYearMonth(date).year;
}

const hourFormat = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	hour: "numeric",
	hourCycle: "h23",
});

/** Napszaknak megfelelő köszönés budapesti idő szerint. */
export function greeting(now: Date): string {
	const hour = Number(hourFormat.format(now));
	if (hour >= 4 && hour < 10) return "Jó reggelt";
	if (hour >= 10 && hour < 18) return "Szép napot";
	return "Jó estét";
}

/**
 * Túljelentkezés: beérkezett jelentkezések / meghirdetett férőhelyek.
 * Csak a kapacitással rendelkező programok számítanak; ha nincs férőhely,
 * `null`.
 */
export function oversubscription(events: EventStat[]): number | null {
	let capacity = 0;
	let applications = 0;
	for (const event of events) {
		if (event.capacity <= 0) continue;
		capacity += event.capacity;
		applications += event.applications;
	}
	return capacity > 0 ? applications / capacity : null;
}

/** Százalékos változás; ha nincs összevethető előző érték, `null`. */
export function percentChange(current: number, previous: number) {
	return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export type CapacityRow = {
	id: string;
	name: string;
	capacity: number;
	applications: number;
	byStatus: StatusBreakdown;
	/** Jelentkezők / kapacitás; `null`, ha nincs megadva kapacitás. */
	ratio: number | null;
	/** Múltbeli: már véget ért; jövőbeli: még nem ért véget (a most zajló is). */
	state: "upcoming" | "past";
};

/** Programonkénti kapacitás vs. jelentkezők, a legújabb program elöl. */
export function capacityRows(events: EventStat[], now: Date): CapacityRow[] {
	return [...events]
		.sort((a, b) => b.from.getTime() - a.from.getTime())
		.map((event) => ({
			id: event.id,
			name: event.name,
			capacity: event.capacity,
			applications: event.applications,
			byStatus: event.byStatus ?? {},
			ratio:
				event.capacity > 0 ? event.applications / event.capacity : null,
			state: event.to.getTime() < now.getTime() ? "past" : "upcoming",
		}));
}

const MONTH_LABELS = [
	"jan",
	"febr",
	"márc",
	"ápr",
	"máj",
	"jún",
	"júl",
	"aug",
	"szept",
	"okt",
	"nov",
	"dec",
];

export type MonthlyRatio = {
	/** `ÉÉÉÉ-HH` */
	key: string;
	label: string;
	applications: number;
	capacity: number;
	/** `null`, ha abban a hónapban nem indult kapacitással rendelkező program. */
	ratio: number | null;
};

function monthKey(year: number, month: number) {
	return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Az aktuális és az azt megelőző `months - 1` hónap (budapesti idő)
 * kulcsai, a legrégebbi elöl.
 */
export function lastMonths(now: Date, months: number) {
	const { year, month } = budapestYearMonth(now);
	return Array.from({ length: months }, (_, i) => {
		const index = year * 12 + (month - 1) - (months - 1 - i);
		const y = Math.floor(index / 12);
		const m = (index % 12) + 1;
		return { key: monthKey(y, m), label: MONTH_LABELS[m - 1] };
	});
}

/**
 * A `lastMonths` ablak legkorábbi hónapjának eleje lekérdezéshez. Kicsit
 * korábbi (a budapesti eltolás legfeljebb 2 óra), a hónapra bontás úgyis a
 * budapesti hónap szerint történik.
 */
export function lastMonthsStart(now: Date, months: number): Date {
	const [year, month] = lastMonths(now, months)[0].key.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, 1) - 2 * 60 * 60 * 1000);
}

/**
 * Havi túljelentkezés az elmúlt `months` hónapban: az adott hónapban induló
 * programok összes jelentkezése / összes férőhelye.
 */
export function monthlyOversubscription(
	events: EventStat[],
	now: Date,
	months = 6,
): MonthlyRatio[] {
	const buckets = new Map(
		lastMonths(now, months).map(({ key, label }) => [
			key,
			{ key, label, applications: 0, capacity: 0 },
		]),
	);
	for (const event of events) {
		if (event.capacity <= 0) continue;
		const { year, month } = budapestYearMonth(event.from);
		const bucket = buckets.get(monthKey(year, month));
		if (!bucket) continue;
		bucket.applications += event.applications;
		bucket.capacity += event.capacity;
	}
	return [...buckets.values()].map((b) => ({
		...b,
		ratio: b.capacity > 0 ? b.applications / b.capacity : null,
	}));
}

export type CountRow = { label: string; count: number };

const AGE_BUCKETS: { label: string; min: number; max: number }[] = [
	{ label: "10 alatt", min: -Infinity, max: 9 },
	{ label: "10–12", min: 10, max: 12 },
	{ label: "13–15", min: 13, max: 15 },
	{ label: "16–18", min: 16, max: 18 },
	{ label: "19+", min: 19, max: Infinity },
];

/** Ezek a sávok akkor is megjelennek, ha üresek. */
const CORE_AGE_BUCKETS = new Set(["10–12", "13–15", "16–18", "19+"]);

export const MISSING_LABEL = "Nincs adat";

/**
 * Életkor a program évében: a program kezdő éve (budapesti idő) − születési
 * év; `null`, ha nincs születési év.
 */
export function ageAtEvent(
	birthYear: number | null,
	eventFrom: Date,
): number | null {
	return birthYear === null ? null : budapestYear(eventFrom) - birthYear;
}

/**
 * Életkor-megoszlás sávokba. A „10 alatt” és a „Nincs adat” sáv csak akkor
 * jelenik meg, ha van benne valaki.
 */
export function ageDistribution(ages: (number | null)[]): CountRow[] {
	const counts = new Map(AGE_BUCKETS.map((b) => [b.label, 0]));
	let missing = 0;
	for (const age of ages) {
		if (age === null) {
			missing += 1;
			continue;
		}
		const bucket = AGE_BUCKETS.find((b) => age >= b.min && age <= b.max);
		if (bucket) counts.set(bucket.label, counts.get(bucket.label)! + 1);
	}
	const rows = [...counts]
		.filter(([label, count]) => CORE_AGE_BUCKETS.has(label) || count > 0)
		.map(([label, count]) => ({ label, count }));
	if (missing > 0) rows.push({ label: MISSING_LABEL, count: missing });
	return rows;
}

export const OTHER_LABEL = "Egyéb";

/**
 * Település-megoszlás: a leggyakoribb `top` település, a többi az „Egyéb”
 * sorba, a hiányzó adat a „Nincs adat” sorba kerül. Kis- és nagybetű,
 * illetve a fölösleges szóközök nem számítanak; a leggyakoribb írásmód
 * jelenik meg.
 */
export function hometownDistribution(
	hometowns: (string | null)[],
	top = 8,
): CountRow[] {
	const groups = new Map<
		string,
		{ count: number; spellings: Map<string, number> }
	>();
	let missing = 0;
	for (const raw of hometowns) {
		const name = raw?.trim().replace(/\s+/g, " ");
		if (!name) {
			missing += 1;
			continue;
		}
		const key = name.toLocaleLowerCase("hu-HU");
		const group = groups.get(key) ?? { count: 0, spellings: new Map() };
		group.count += 1;
		group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
		groups.set(key, group);
	}

	const sorted = [...groups.values()]
		.map((g) => ({
			label: [...g.spellings].sort((a, b) => b[1] - a[1])[0][0],
			count: g.count,
		}))
		.sort(
			(a, b) => b.count - a.count || a.label.localeCompare(b.label, "hu"),
		);

	const rows = sorted.slice(0, top);
	const other = sorted.slice(top).reduce((sum, r) => sum + r.count, 0);
	if (other > 0) rows.push({ label: OTHER_LABEL, count: other });
	if (missing > 0) rows.push({ label: MISSING_LABEL, count: missing });
	return rows;
}

/**
 * Darabszám szerint csökkenő sorrend (az „Egyéb” sor is a számával áll
 * sorba); a „Nincs adat” sor mindig a végén marad. Egyező darabszámnál az
 * eredeti sorrend marad.
 */
export function orderByCount(rows: CountRow[]): CountRow[] {
	const known = rows.filter((r) => r.label !== MISSING_LABEL);
	const missing = rows.filter((r) => r.label === MISSING_LABEL);
	return [...known.sort((a, b) => b.count - a.count), ...missing];
}

const ratioFormat = new Intl.NumberFormat("hu-HU", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/** 2.43 → "2,4×" */
export function formatRatio(ratio: number): string {
	return `${ratioFormat.format(ratio)}×`;
}

/** Előjeles szám egy tizedesre: 0.3 → "+0,3", −0.3 → "−0,3". */
export function formatSignedDecimal(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
	return `${sign}${ratioFormat.format(Math.abs(rounded))}`;
}

/** Előjeles egész százalék: 18.2 → "+18%". */
export function formatSignedPercent(value: number): string {
	const rounded = Math.round(value);
	const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
	return `${sign}${Math.abs(rounded)}%`;
}

export type FeedbackRoleKey = "PARTICIPANT" | "MENTOR";

/** Egy visszajelzés a dashboard szemszögéből. */
export type FeedbackStat = {
	eventId: string;
	eventName: string;
	eventFrom: Date;
	role: FeedbackRoleKey;
	overallScore: number | null;
	recommend: string | null;
};

/** Az átlagolt mezők: a program azonosítása nélkül is összesíthető. */
export type FeedbackScore = Pick<
	FeedbackStat,
	"role" | "overallScore" | "recommend"
>;

/** Átlag (1–5) és az átlagba számító kitöltések száma; üresen `average: null`. */
export type ScoreSummary = { average: number | null; count: number };

export type RecommendSummary = {
	yes: number;
	maybe: number;
	no: number;
	total: number;
};

export type RoleSatisfaction = {
	score: ScoreSummary;
	recommend: RecommendSummary;
	/** Összes kitöltés (pontszámtól függetlenül). */
	responses: number;
};

export type Satisfaction = Record<FeedbackRoleKey, RoleSatisfaction>;

export type ProgramSatisfaction = {
	id: string;
	name: string;
	participant: ScoreSummary;
	mentor: ScoreSummary;
};

function scoreSummary(rows: FeedbackScore[]): ScoreSummary {
	let sum = 0;
	let count = 0;
	for (const row of rows) {
		if (row.overallScore === null) continue;
		sum += row.overallScore;
		count += 1;
	}
	return { average: count ? sum / count : null, count };
}

function recommendSummary(rows: FeedbackScore[]): RecommendSummary {
	const out = { yes: 0, maybe: 0, no: 0, total: 0 };
	for (const row of rows) {
		if (
			row.recommend === "yes" ||
			row.recommend === "maybe" ||
			row.recommend === "no"
		) {
			out[row.recommend] += 1;
			out.total += 1;
		}
	}
	return out;
}

/** Szerepkörönkénti elégedettség (résztvevő / mentor külön). */
export function satisfactionByRole(rows: FeedbackScore[]): Satisfaction {
	const of = (role: FeedbackRoleKey): RoleSatisfaction => {
		const own = rows.filter((r) => r.role === role);
		return {
			score: scoreSummary(own),
			recommend: recommendSummary(own),
			responses: own.length,
		};
	};
	return { PARTICIPANT: of("PARTICIPANT"), MENTOR: of("MENTOR") };
}

/**
 * Programonkénti átlag szerepkörönként. A sorrend: résztvevői átlag szerint
 * csökkenő, pontszám nélküliek a végén, egyezésnél név szerint.
 */
export function programSatisfaction(
	rows: FeedbackStat[],
): ProgramSatisfaction[] {
	const byEvent = new Map<string, FeedbackStat[]>();
	for (const row of rows) {
		const list = byEvent.get(row.eventId);
		if (list) list.push(row);
		else byEvent.set(row.eventId, [row]);
	}
	const result = [...byEvent.values()].map((list) => ({
		id: list[0].eventId,
		name: list[0].eventName,
		participant: scoreSummary(list.filter((r) => r.role === "PARTICIPANT")),
		mentor: scoreSummary(list.filter((r) => r.role === "MENTOR")),
	}));
	const key = (p: ProgramSatisfaction) =>
		p.participant.average ?? p.mentor.average ?? -1;
	return result.sort(
		(a, b) => key(b) - key(a) || a.name.localeCompare(b.name, "hu"),
	);
}

/** 4.63 → "4,6" */
export function formatScore(score: number): string {
	return ratioFormat.format(score);
}

/** Egész százalék a teljeshez képest (0, ha nincs teljes). */
export function share(part: number, total: number): number {
	return total ? Math.round((part / total) * 100) : 0;
}
