import type { z } from "zod";
import type { EventTag } from "./events/tags";
import type { dataFileSchema } from "./seed-data-schema";

/**
 * Kitalált, determinisztikus demóadat a lokális seedhez, hogy az Áttekintés
 * (dashboard) minden kártyája tesztelhető legyen: tavalyi és idei programok,
 * az elmúlt 6 hónap, jövőbeli programok, túl- és alul-jelentkezés, sokféle
 * életkor és település (hiányzó adattal, eltérő írásmóddal), több programra
 * jelentkező diákok.
 *
 * A dátumok a futtatás idejéhez igazodnak (előző év januárjától a következő
 * 3 hónapig), így a dashboard „idei” és „tavalyi” éve mindig ki van töltve.
 * Az id-k (`demo_…`) stabilak, újrafuttatáskor upsert frissíti őket.
 */

type DataFileInput = z.input<typeof dataFileSchema>;
type EventInput = NonNullable<DataFileInput["events"]>[number];
type ApplicantInput = NonNullable<DataFileInput["applicants"]>[number];
type ApplicationInput = NonNullable<DataFileInput["applications"]>[number];

/** Kis, seedelt pszeudo-véletlen generátor (mulberry32): mindig ugyanaz a sor. */
function random(seed: number) {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min: number, max: number) =>
			min + Math.floor(next() * (max - min + 1)),
		pick: <T>(items: readonly T[]) =>
			items[Math.floor(next() * items.length)],
	};
}

const PROGRAMS: { name: string; tags: EventTag[]; ageRange: string }[] = [
	{
		name: "Python alapok",
		tags: ["programozás", "kezdő"],
		ageRange: "12-16",
	},
	{
		name: "Robotika workshop",
		tags: ["robotika", "kezdő"],
		ageRange: "10-14",
	},
	{
		name: "Mobilapp & AI workshop",
		tags: ["programozás", "haladó"],
		ageRange: "14-18",
	},
	{
		name: "STEMsisters mentorprogram",
		tags: ["programozás"],
		ageRange: "13-18",
	},
	{
		name: "Webfejlesztés tábor",
		tags: ["programozás", "kezdő"],
		ageRange: "13-17",
	},
	{ name: "Rolling Office", tags: ["robotika"], ageRange: "10-16" },
	{
		name: "Adatelemzés délután",
		tags: ["programozás", "haladó"],
		ageRange: "15-19",
	},
	{
		name: "Játékfejlesztés Unityben",
		tags: ["programozás", "haladó"],
		ageRange: "14-18",
	},
];

const COMPANIES = [
	"Minta Robotics Kft.",
	"Példa Szoftver Zrt.",
	"Demo Bank Nyrt.",
	null,
];

const LOCATIONS = ["Budapest", "Debrecen", "Szeged", "Ózd", "Online"];

const MONTHS = [
	"január",
	"február",
	"március",
	"április",
	"május",
	"június",
	"július",
	"augusztus",
	"szeptember",
	"október",
	"november",
	"december",
];

/**
 * Súlyozott településlista. A „budapest” és az „Ózd ” szándékosan eltérő
 * írásmód (a dashboard összevonja őket), a `null` hiányzó adat.
 */
const HOMETOWNS: [string | null, number][] = [
	["Budapest", 30],
	["budapest", 4],
	["Debrecen", 10],
	["Szeged", 8],
	["Miskolc", 7],
	["Pécs", 6],
	["Győr", 5],
	["Ózd", 5],
	["Ózd ", 2],
	["Eger", 4],
	["Kecskemét", 4],
	["Nyíregyháza", 3],
	["Szolnok", 2],
	["Veszprém", 2],
	["Sopron", 1],
	["Tiszaújváros", 1],
	[null, 6],
];

const LAST_NAMES = [
	"Kovács",
	"Nagy",
	"Szabó",
	"Tóth",
	"Horváth",
	"Varga",
	"Kiss",
	"Molnár",
	"Németh",
	"Farkas",
	"Balogh",
	"Papp",
	"Takács",
	"Juhász",
	"Lakatos",
];

const FIRST_NAMES = [
	"Bence",
	"Lili",
	"Márk",
	"Hanna",
	"Levente",
	"Zoé",
	"Dominik",
	"Anna",
	"Máté",
	"Boglárka",
	"Olivér",
	"Luca",
	"Dániel",
	"Réka",
	"Ádám",
	"Flóra",
];

type Status = NonNullable<ApplicationInput["status"]>;

const PAST_STATUSES: [Status, number][] = [
	["ATTENDED", 6],
	["REJECTED", 3],
	["ACCEPTED", 1],
];

const UPCOMING_STATUSES: [Status, number][] = [
	["APPLIED", 5],
	["ACCEPTED", 3],
	["WAITLISTED", 2],
];

const APPLICANT_COUNT = 260;
const DAY = 24 * 60 * 60 * 1000;

function weighted<T>(rng: ReturnType<typeof random>, items: [T, number][]) {
	const total = items.reduce((sum, [, w]) => sum + w, 0);
	let roll = rng.next() * total;
	for (const [item, w] of items) {
		roll -= w;
		if (roll < 0) return item;
	}
	return items[items.length - 1][0];
}

/** Budapesti helyi idő → Date (téli idő +01:00, nyári +02:00, közelítőleg). */
function localDate(year: number, month: number, day: number, hour: number) {
	const summer = month >= 4 && month <= 10;
	const offset = summer ? "+02:00" : "+01:00";
	const pad = (n: number) => String(n).padStart(2, "0");
	return new Date(
		`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00${offset}`,
	);
}

export function dashboardDemoData(now = new Date()): Required<DataFileInput> {
	const rng = random(20261119);
	const year = now.getFullYear();

	const applicants: ApplicantInput[] = Array.from(
		{ length: APPLICANT_COUNT },
		(_, i) => {
			const firstName = rng.pick(FIRST_NAMES);
			const lastName = rng.pick(LAST_NAMES);
			// Életkor ~8–22 év idén; kb. 5% születési év nélkül.
			const birthYear = rng.next() < 0.05 ? null : year - rng.int(8, 22);
			return {
				id: `demo_applicant_${i + 1}`,
				firstName,
				lastName,
				birthYear,
				hometown: weighted(rng, HOMETOWNS),
				schoolName: rng.pick([
					"Minta Általános Iskola",
					"Példa Gimnázium",
					"Demo Technikum",
					null,
				]),
				email: `demo.${i + 1}@example.com`,
				parentEmail: `demo.szulo.${i + 1}@example.com`,
				newsletter: rng.next() < 0.4,
			};
		},
	);

	const events: EventInput[] = [];
	const applications: ApplicationInput[] = [];

	// Előző év januárjától a mostani után 3 hónapig, havonta 1–2 program.
	const first = (year - 1) * 12;
	const last = year * 12 + now.getMonth() + 3;
	for (let index = first; index <= last; index += 1) {
		const y = Math.floor(index / 12);
		const m = (index % 12) + 1;
		const perMonth = rng.int(1, 2);
		for (let k = 1; k <= perMonth; k += 1) {
			const program = rng.pick(PROGRAMS);
			const day = rng.int(3, 24);
			const from = localDate(y, m, day, 9);
			const to = new Date(
				from.getTime() + rng.int(0, 4) * DAY + 7 * 60 * 60 * 1000,
			);
			const capacity = rng.pick([10, 12, 15, 20, 24, 30, 40]);
			const id = `demo_event_${y}_${String(m).padStart(2, "0")}_${k}`;
			events.push({
				id,
				name: `${program.name} – ${y}. ${MONTHS[m - 1]}`,
				from,
				to,
				companyName: rng.pick(COMPANIES),
				location: rng.pick(LOCATIONS),
				description: "Demóadat a dashboard teszteléséhez.",
				ageRange: program.ageRange,
				instructor: rng.pick([
					"Kovács Péter",
					"Tóth Réka",
					"Varga Zsuzsa",
				]),
				mentors: [],
				tags: program.tags,
				capacity,
			});

			// Túljelentkezés 0,5× és 3,2× között; a jövőbeli programokra még
			// csak a jelentkezések egy része érkezett be.
			const upcoming = from > now;
			const ratio = 0.5 + rng.next() * 2.7;
			let count = Math.round(capacity * ratio * (upcoming ? 0.5 : 1));
			count = Math.min(count, APPLICANT_COUNT);

			const chosen = new Set<number>();
			while (chosen.size < count) chosen.add(rng.int(1, APPLICANT_COUNT));

			for (const applicantNo of chosen) {
				// 3–60 nappal a kezdés előtt, de legkésőbb most.
				const received = Math.min(
					from.getTime() -
						rng.int(3, 60) * DAY -
						rng.int(0, 23) * 3600_000,
					now.getTime() - rng.int(1, 72) * 3600_000,
				);
				const ended = to < now;
				applications.push({
					id: `demo_application_${id}_${applicantNo}`,
					eventId: id,
					applicantId: `demo_applicant_${applicantNo}`,
					receivedAt: new Date(received),
					status: weighted(
						rng,
						ended ? PAST_STATUSES : UPCOMING_STATUSES,
					),
				});
			}
		}
	}

	return { events, applicants, applications };
}
