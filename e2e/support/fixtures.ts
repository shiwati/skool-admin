import type { ApplicationStatus, Prisma } from "@prisma/client";

/**
 * Determinisztikus tesztadat az E2E adatbázisba. A nevek csak ASCII-betűsek
 * és különbözőek, így a név szerinti rendezés bármely Postgres-kollációval
 * ugyanaz; a dátumok rögzítettek (nem a mai naphoz képest), a rendezési
 * kulcsok egyediek.
 */

export const ADMIN_USER = {
	id: "e2e-admin",
	name: "E2E Admin",
	email: "e2e-admin@example.org",
} as const;

const day = (iso: string, plusDays = 0) =>
	new Date(Date.parse(`${iso}T09:00:00.000Z`) + plusDays * 86_400_000);

const pad = (n: number) => String(n).padStart(2, "0");

type EventSeed = Prisma.EventCreateManyInput & {
	id: string;
	name: string;
	from: Date;
	capacity: number;
};

const EVENT_ROWS: [
	name: string,
	from: string,
	capacity: number,
	company: string | null,
	location: string,
][] = [
	["Algoritmus klub", "2025-03-08", 20, null, "Budapest"],
	["Blender tabor", "2027-07-12", 16, "Pixel Kft.", "Debrecen"],
	["Cpp kezdo", "2024-10-05", 12, null, "Szeged"],
	["Dron epites", "2026-02-14", 24, "Repulo Zrt.", "Gyor"],
	["Elektronika", "2025-11-22", 10, null, "Pecs"],
	["Figma workshop", "2027-01-30", 18, "Design Bt.", "Budapest"],
	["Git alapok", "2024-04-20", 30, null, "Miskolc"],
	["Html es css", "2026-06-01", 14, null, "Budapest"],
	["Java halado", "2025-07-07", 22, "Kave Kft.", "Szeged"],
	["Kotlin tabor", "2027-04-03", 26, null, "Debrecen"],
	["Linux hetvege", "2024-12-07", 8, null, "Gyor"],
	["Mobilapp nyar", "2026-08-10", 28, "Mobil Zrt.", "Pecs"],
];

export const EVENTS: EventSeed[] = EVENT_ROWS.map(
	([name, from, capacity, companyName, location], i) => ({
		id: `e2e-event-${pad(i + 1)}`,
		name,
		from: day(from),
		to: day(from, 2),
		capacity,
		companyName,
		location,
		instructor: i % 2 === 0 ? "Oktato Olga" : null,
		mentors: i % 3 === 0 ? ["Mentor Marci"] : [],
		tags: i % 4 === 0 ? ["robotika"] : [],
	}),
);

/** A program, amelynek Jelentkezők fülét a tesztek használják (12 jelentkezés). */
export const OVERVIEW_EVENT = EVENTS[0];

const LAST_NAMES = [
	"Antal",
	"Bakos",
	"Balogh",
	"Barta",
	"Bodor",
	"Dobos",
	"Erdei",
	"Farkas",
	"Fekete",
	"Gal",
	"Hajdu",
	"Horvath",
	"Jakab",
	"Kadar",
	"Kelemen",
	"Lakatos",
	"Major",
	"Medve",
	"Molnar",
	"Nemeth",
	"Orban",
	"Pap",
	"Peto",
	"Rigo",
	"Simon",
	"Toth",
	"Ujvari",
	"Vadas",
	"Vida",
	"Zold",
];
const FIRST_NAMES = [
	"Anna",
	"Bence",
	"Csilla",
	"Dani",
	"Emma",
	"Filip",
	"Greta",
	"Hanna",
];
const HOMETOWNS = ["Budapest", "Debrecen", "Szeged", null, "Pecs"];

/** Az egyetlen 2015-ös születésű: a legfiatalabb. */
export const YOUNGEST_INDEX = 13;
const NO_BIRTH_YEAR_INDEX = 20;

type ApplicantSeed = Prisma.ApplicantCreateManyInput & {
	id: string;
	firstName: string;
	lastName: string;
	createdAt: Date;
};

export const APPLICANTS: ApplicantSeed[] = LAST_NAMES.map((lastName, i) => {
	const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
	return {
		id: `e2e-applicant-${pad(i + 1)}`,
		lastName,
		firstName,
		email: `${firstName}.${lastName}@example.com`.toLowerCase(),
		// A permutation of 30 distinct days, unrelated to the name order.
		createdAt: day("2026-01-01", (i * 7) % 30),
		birthYear:
			i === YOUNGEST_INDEX
				? 2015
				: i === NO_BIRTH_YEAR_INDEX
					? null
					: 2006 + ((i * 3) % 8),
		hometown: HOMETOWNS[i % HOMETOWNS.length],
		schoolName: i % 2 === 0 ? "Minta Gimnazium" : null,
		phoneNumber: `+36 30 000 00${pad(i)}`,
		newsletter: i % 3 === 0,
	};
});

const OVERVIEW_STATUSES: ApplicationStatus[] = [
	"APPLIED",
	"ACCEPTED",
	"WAITLISTED",
	"REJECTED",
	"ATTENDED",
	"APPLIED",
];

type ApplicationSeed = Prisma.ApplicationCreateManyInput & {
	id: string;
	applicantId: string;
	eventId: string;
	receivedAt: Date;
};

/** Az első 12 jelentkező a `OVERVIEW_EVENT`-re; a többi egy-egy másik programra. */
export const APPLICATIONS: ApplicationSeed[] = APPLICANTS.map((applicant, i) =>
	i < 12
		? {
				id: `e2e-application-${pad(i + 1)}`,
				applicantId: applicant.id,
				eventId: OVERVIEW_EVENT.id,
				status: OVERVIEW_STATUSES[i % OVERVIEW_STATUSES.length],
				// 12 distinct days, unrelated to the name order.
				receivedAt: day("2025-02-01", (i * 5) % 12),
			}
		: {
				id: `e2e-application-${pad(i + 1)}`,
				applicantId: applicant.id,
				eventId: EVENTS[1 + (i % (EVENTS.length - 1))].id,
				status: "APPLIED",
				receivedAt: day("2026-03-01", i),
			},
);

/** Vezetéknév + utónév, ahogy az app is írja. */
export const fullName = (a: { firstName: string; lastName: string }) =>
	`${a.lastName} ${a.firstName}`;

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Jelentkezők nevei a megadott rendezésben. */
export function applicantNames(
	order: "createdAt-desc" | "name-asc" | "name-desc",
): string[] {
	const list = [...APPLICANTS];
	if (order === "createdAt-desc") {
		list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	} else {
		list.sort((a, b) => byText(a.lastName, b.lastName));
		if (order === "name-desc") list.reverse();
	}
	return list.map(fullName);
}

/** Programnevek a megadott rendezésben. */
export function eventNames(
	order: "from-desc" | "name-asc" | "name-desc" | "capacity-asc",
): string[] {
	const list = [...EVENTS];
	if (order === "from-desc") {
		list.sort((a, b) => b.from.getTime() - a.from.getTime());
	} else if (order === "capacity-asc") {
		list.sort((a, b) => a.capacity - b.capacity);
	} else {
		list.sort((a, b) => byText(a.name, b.name));
		if (order === "name-desc") list.reverse();
	}
	return list.map((e) => e.name);
}

/** Az `OVERVIEW_EVENT` jelentkezőinek nevei a megadott rendezésben. */
export function overviewApplicantNames(
	order: "receivedAt-asc" | "name-asc",
): string[] {
	const rows = APPLICATIONS.filter(
		(a) => a.eventId === OVERVIEW_EVENT.id,
	).map((application) => ({
		application,
		applicant: APPLICANTS.find((a) => a.id === application.applicantId)!,
	}));
	if (order === "receivedAt-asc") {
		rows.sort(
			(a, b) =>
				a.application.receivedAt.getTime() -
				b.application.receivedAt.getTime(),
		);
	} else {
		rows.sort((a, b) => byText(a.applicant.lastName, b.applicant.lastName));
	}
	return rows.map((r) => fullName(r.applicant));
}
