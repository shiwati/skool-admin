import type { z } from "zod";
import { overallScore } from "./feedback/parse";
import {
	type FeedbackRoleKey,
	QUESTIONS,
	type Recommend,
} from "./feedback/questions";
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

const PROGRAMS: { name: string; tags: string[]; ageRange: string }[] = [
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

/** Seedbe szánt anonim visszajelzés (a sheet-szinkron kimenetének formája). */
export type DemoFeedback = {
	id: string;
	eventId: string;
	role: FeedbackRoleKey;
	submittedAt: Date;
	answers: Record<string, string | number>;
	overallScore: number | null;
	recommend: Recommend | null;
	searchText: string;
	sourceKey: string;
};

export type DemoData = Required<DataFileInput> & {
	feedback: DemoFeedback[];
	/** A visszajelző sheet URL-jei eseményenként (a fájlséma nem ismeri őket). */
	feedbackSheets: {
		eventId: string;
		participantFeedbackSheetUrl: string;
		mentorFeedbackSheetUrl: string;
	}[];
};

const MENTOR_NAMES = [
	"Nagy Anna",
	"Szabó Gergő",
	"Kiss Dániel",
	"Fehér Lilla",
	"Balogh Eszter",
	"Molnár Tamás",
	"Horváth Nóra",
	"Papp Bálint",
	"Juhász Kinga",
	"Takács Zoltán",
];

const SCHOOLS = [
	"Minta Általános Iskola",
	"Példa Gimnázium",
	"Demo Technikum",
	"Próba Református Gimnázium",
	"Teszt Szakgimnázium",
];

const FOOD = [
	"nincs",
	"nincs",
	"nincs",
	"vegetáriánus",
	"laktózmentes",
	"gluténmentes",
];
const HEARD_WHERE = [
	"Instagram",
	"Facebook",
	"iskolában",
	"ismerőstől",
	"Skool hírlevél",
	"TikTok",
];
const HEARD_WHOM = [
	"osztályfőnök",
	"barátnő",
	"szülő",
	"testvér",
	"informatikatanár",
	null,
];
const PAST_EXP = [
	"Még nem programoztam.",
	"Scratch-ben csináltam pár játékot.",
	"Iskolában tanultunk egy kis Pythont.",
	"Egy online kurzust elkezdtem.",
	"Weboldalt már készítettem HTML-lel.",
];
const SOLVED = [
	"Egy appot, ami emlékeztet a leckére.",
	"Weboldalt a kutyamenhelynek.",
	"Játékot, ami matekot tanít.",
	"Egy robotot, ami öntözi a növényeket.",
	"Alkalmazást a szelektív gyűjtéshez.",
];

const FEELING = [
	"Nagyon jól éreztem magam, mindenki kedves volt!",
	"Szuper volt, kicsit izgultam az elején, de hamar belejöttem.",
	"Jó volt, bár a nap végére elfáradtam.",
	"Fantasztikus nap, már várom a következőt!",
	"Jól, de néha túl gyors volt a tempó.",
];
const FAVORITE = [
	"Amikor elindult a saját appom a telefonomon.",
	"A robot programozása.",
	"A csapatmunka a többiekkel.",
	"Az irodai körbevezetés.",
	"Amikor a mentorok meséltek a munkájukról.",
];
const WISH = [
	"Játékfejlesztés",
	"Mesterséges intelligencia",
	"Weboldalak dizájnja",
	"Kiberbiztonság",
	"Adatelemzés",
];
const TO_MENTOR = [
	"Köszönöm, hogy ilyen türelmes voltál!",
	"Te voltál a legjobb mentor!",
	"Köszi a sok segítséget!",
	"Remélem, még találkozunk!",
];
const TO_GIRLS = [
	"Gyertek bátran, nem kell hozzá előtudás!",
	"Megéri, tök jó a hangulat!",
	"Ne féljetek a programozástól, sokkal könnyebb, mint gondolnátok.",
];
const INSTRUCTOR_IMPROVE = [
	"Lassabban magyarázhatna.",
	"Semmit, tökéletes volt.",
	"Több szünet jó lenne.",
	"-",
];
const HIGHLIGHT = [
	"Amikor a lányok bemutatták a kész appjaikat.",
	"A közös ebéd és a beszélgetések.",
	"Látni, ahogy valaki először futtatja a saját kódját.",
	"A csapatok közötti verseny.",
];
const LEAST_LIKED = [
	"Kicsit szűkös volt a terem.",
	"A wifi akadozott.",
	"Túl rövid volt az idő a feladatokra.",
	"Semmi, minden rendben volt.",
];
const SKOOL_SUPPORT = [
	"Előre megkaphatnánk a feladatokat.",
	"Rövid mentorfelkészítő a program előtt.",
	"Jól működött így is.",
];
const MOTIVATION = [
	"Szeretném, ha több lány jönne a szakmába.",
	"A cégem ajánlotta, és kíváncsi voltam.",
	"Én is ilyen programon kezdtem.",
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

export function dashboardDemoData(now = new Date()): DemoData {
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
				schoolName: rng.pick(SCHOOLS),
				phoneNumber: `+36 30 ${String(1000000 + i * 7919).slice(0, 7)}`,
				email: `demo.${i + 1}@example.com`,
				parentFirstName: rng.pick([
					"Katalin",
					"Péter",
					"Erika",
					"Gábor",
					"Judit",
					"László",
				]),
				parentLastName: lastName,
				parentMothersName: `${rng.pick(LAST_NAMES)} ${rng.pick(["Mária", "Ilona", "Éva", "Zsuzsanna"])}`,
				parentAddress: `${rng.int(1000, 9999)} Mintaváros, Példa utca ${rng.int(1, 120)}.`,
				parentEmail: `demo.szulo.${i + 1}@example.com`,
				parentPhone: `+36 20 ${String(2000000 + i * 6271).slice(0, 7)}`,
				newsletter: rng.next() < 0.4,
			};
		},
	);

	const events: EventInput[] = [];
	const applications: ApplicationInput[] = [];
	const feedback: DemoFeedback[] = [];
	const feedbackSheets: DemoData["feedbackSheets"] = [];

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
			const mentors = [
				...new Set(
					Array.from({ length: rng.int(2, 4) }, () =>
						rng.pick(MENTOR_NAMES),
					),
				),
			];
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
				applicationSheetUrl: `https://docs.google.com/spreadsheets/d/${id}-jelentkezes`,
				mentors,
				tags: program.tags,
				capacity,
			});

			// Túljelentkezés 0,5× és 3,2× között; a jövőbeli programokra még
			// csak a jelentkezések egy része érkezett be.
			const upcoming = from > now;
			const ratio = 0.5 + rng.next() * 2.7;
			let count = Math.round(capacity * ratio * (upcoming ? 0.8 : 1));
			count = Math.min(count, APPLICANT_COUNT);

			const chosen = new Set<number>();
			while (chosen.size < count) chosen.add(rng.int(1, APPLICANT_COUNT));

			// Státusz a kapacitáshoz igazítva, jelentkezési sorrendben:
			// lezárt programnál a helyek ~90%-a ténylegesen részt vett (a többi
			// elfogadott, de nem jött el), a többletet elutasították; jövőbeli
			// programnál a helyek egy része már elfogadva, túljelentkezésnél
			// várólista, a maradék még elbírálatlan.
			const ended = to < now;
			const rows = [...chosen]
				.map((applicantNo) => ({
					applicantNo,
					// 3–60 nappal a kezdés előtt, de legkésőbb most.
					received: Math.min(
						from.getTime() -
							rng.int(3, 60) * DAY -
							rng.int(0, 23) * 3600_000,
						now.getTime() - rng.int(1, 72) * 3600_000,
					),
				}))
				.sort((a, b) => a.received - b.received);
			const accepted = upcoming
				? Math.round(capacity * (0.3 + rng.next() * 0.5))
				: capacity;
			let attended = 0;
			rows.forEach(({ applicantNo, received }, rank) => {
				let status: Status;
				if (ended) {
					if (rank < capacity) {
						status = rng.next() < 0.9 ? "ATTENDED" : "ACCEPTED";
					} else {
						status = "REJECTED";
					}
				} else if (rank < accepted) {
					status = "ACCEPTED";
				} else if (rank < capacity) {
					status = rng.next() < 0.1 ? "REJECTED" : "APPLIED";
				} else {
					status = rng.next() < 0.6 ? "WAITLISTED" : "APPLIED";
				}
				if (status === "ATTENDED") attended += 1;
				const returning = rng.next() < 0.25;
				applications.push({
					id: `demo_application_${id}_${applicantNo}`,
					eventId: id,
					applicantId: `demo_applicant_${applicantNo}`,
					receivedAt: new Date(received),
					status,
					foodPreference: rng.pick(FOOD),
					heardFromWhere: rng.pick(HEARD_WHERE),
					heardFromWhom: rng.pick(HEARD_WHOM),
					solvedProblem: rng.pick(SOLVED),
					pastExpInProg: rng.pick(PAST_EXP),
					pastParticipationOther:
						rng.next() < 0.3
							? "Lányok napja, Bebras verseny"
							: null,
					pastParticipationSkool: returning,
					pastParticipationSkoolDesc: returning
						? "Voltam már egy Skool workshopon."
						: null,
					comment:
						rng.next() < 0.15 ? "Ételallergiám van (dió)." : null,
					companyAwareness: rng.next() < 0.5,
				});
			});

			if (ended) {
				feedbackSheets.push({
					eventId: id,
					participantFeedbackSheetUrl: `https://docs.google.com/spreadsheets/d/${id}-resztvevoi`,
					mentorFeedbackSheetUrl: `https://docs.google.com/spreadsheets/d/${id}-mentori`,
				});
				// Programonként eltérő „minőség”, hogy a riportok különbözzenek.
				const quality = 0.4 + rng.next() * 0.6;
				const responses = Math.round(
					attended * (0.55 + rng.next() * 0.4),
				);
				for (let n = 0; n < responses; n += 1) {
					feedback.push(
						demoFeedback(rng, id, "PARTICIPANT", n, to, quality),
					);
				}
				mentors.forEach((_, n) => {
					if (rng.next() < 0.8) {
						feedback.push(
							demoFeedback(rng, id, "MENTOR", n, to, quality),
						);
					}
				});
			}
		}
	}

	return { events, applicants, applications, feedback, feedbackSheets };
}

/**
 * Visszajelzés a fájlból (`sample.json`) jött, már lezárt eseményekhez. A
 * válaszok száma a résztvevők számához igazodik, de legalább 4, hogy a
 * kézi mintaeseményeken is legyen mit riportolni.
 */
export function sampleFeedback(
	events: { id: string; to: Date; mentors: string[] }[],
	applications: { eventId: string; status?: Status }[],
	now = new Date(),
): Pick<DemoData, "feedback" | "feedbackSheets"> {
	const rng = random(20261120);
	const feedback: DemoFeedback[] = [];
	const feedbackSheets: DemoData["feedbackSheets"] = [];
	for (const event of events) {
		if (event.to >= now) continue;
		feedbackSheets.push({
			eventId: event.id,
			participantFeedbackSheetUrl: `https://docs.google.com/spreadsheets/d/${event.id}-resztvevoi`,
			mentorFeedbackSheetUrl: `https://docs.google.com/spreadsheets/d/${event.id}-mentori`,
		});
		const attended = applications.filter(
			(a) => a.eventId === event.id && a.status === "ATTENDED",
		).length;
		const quality = 0.4 + rng.next() * 0.6;
		const responses = Math.max(attended, rng.int(4, 10));
		for (let n = 0; n < responses; n += 1) {
			feedback.push(
				demoFeedback(
					rng,
					event.id,
					"PARTICIPANT",
					n,
					event.to,
					quality,
				),
			);
		}
		event.mentors.forEach((_, n) => {
			feedback.push(
				demoFeedback(rng, event.id, "MENTOR", n, event.to, quality),
			);
		});
	}
	return { feedback, feedbackSheets };
}

/** 1–5 válasz a program minőségéhez húzva (fordított állításnál tükrözve). */
function scale(
	rng: ReturnType<typeof random>,
	quality: number,
	reversed = false,
): number {
	const raw = Math.round(1.5 + quality * 3 + (rng.next() - 0.5) * 2.4);
	const value = Math.min(5, Math.max(1, raw));
	return reversed ? 6 - value : value;
}

function demoFeedback(
	rng: ReturnType<typeof random>,
	eventId: string,
	role: FeedbackRoleKey,
	n: number,
	eventEnd: Date,
	quality: number,
): DemoFeedback {
	const answers: Record<string, string | number> = {};
	for (const q of QUESTIONS[role]) {
		if (q.kind === "scale") {
			// Néhány nem kötelező skálás kérdés kimarad.
			if (!q.required && rng.next() < 0.05) continue;
			answers[q.key] = scale(rng, quality, q.reversed);
		}
	}
	const texts: Record<string, readonly string[]> =
		role === "PARTICIPANT"
			? {
					feeling: FEELING,
					favoriteTopic: FAVORITE,
					wishTopic: WISH,
					messageToMentor: TO_MENTOR,
					messageToGirls: TO_GIRLS,
					instructorImprove: INSTRUCTOR_IMPROVE,
				}
			: {
					highlight: HIGHLIGHT,
					leastLiked: LEAST_LIKED,
					skoolSupport: SKOOL_SUPPORT,
					motivation: MOTIVATION,
				};
	for (const [key, pool] of Object.entries(texts)) {
		if (rng.next() < 0.8) {
			const value = rng.pick(pool);
			if (value !== "-") answers[key] = value;
		}
	}
	if (role === "PARTICIPANT") {
		answers.wouldStudyIt = rng.pick(["Igen", "Talán", "Nem"]);
		answers.firstTime = rng.next() < 0.7 ? "Igen" : "Nem";
		answers.birthYear = eventEnd.getFullYear() - rng.int(11, 18);
		answers.settlement = rng.pick([
			"Főváros",
			"Megyeszékhely",
			"Város",
			"Község",
		]);
	}
	const roll = rng.next() * quality;
	const recommend: Recommend =
		roll > 0.35 ? "yes" : roll > 0.15 ? "maybe" : "no";
	answers.recommend = { yes: "Igen", maybe: "Talán", no: "Nem" }[recommend];

	const submittedAt = new Date(
		eventEnd.getTime() + rng.int(1, 72) * 3600_000 + n * 60_000,
	);
	const searchText = QUESTIONS[role]
		.filter((q) => q.kind === "text" && typeof answers[q.key] === "string")
		.map((q) => answers[q.key])
		.join("\n")
		.toLowerCase();
	const prefix = role === "PARTICIPANT" ? "p" : "m";
	return {
		id: `demo_feedback_${eventId}_${prefix}${n + 1}`,
		eventId,
		role,
		submittedAt,
		answers,
		overallScore: overallScore(role, answers),
		recommend,
		searchText,
		sourceKey: `demo#${prefix}${n + 1}`,
	};
}
