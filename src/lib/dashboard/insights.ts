/**
 * Az Áttekintés összesített (összes év vagy egy év) és egyprogramos nézetének
 * számításai. Tiszta függvények: a lekérdezés az `insights-load.ts`-ben van.
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */

import {
	ageAtEvent,
	ageDistribution,
	hometownDistribution,
	orderByCount,
	satisfactionByRole,
	type CountRow,
	type FeedbackScore,
	type Satisfaction,
	type StatusBreakdown,
} from "./compute";
import type { DateRange } from "./period";

export type Demographics = {
	/** Az egységek (jelentkezés vagy diák) száma, amiből a megoszlás készül. */
	total: number;
	age: CountRow[];
	hometown: CountRow[];
};

export type Returning = { returning: number; total: number };

/** A program korosztálya (`ageRange`: „12-16”); `null`, ha nem értelmezhető. */
export type AgeRange = { min: number; max: number };

export function parseAgeRange(
	value: string | null | undefined,
): AgeRange | null {
	const match = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(value?.trim() ?? "");
	if (!match) return null;
	const min = Number(match[1]);
	const max = Number(match[2]);
	return min <= max ? { min, max } : null;
}

export type AgeFit = {
	range: AgeRange;
	/** Az ismert életkorúak száma; a megoszlás ehhez viszonyít. */
	known: number;
	within: number;
	below: number;
	above: number;
};

/** Hányan esnek a meghirdetett korosztályba; az ismeretlen életkor kimarad. */
export function ageFit(ages: (number | null)[], range: AgeRange): AgeFit {
	const fit: AgeFit = { range, known: 0, within: 0, below: 0, above: 0 };
	for (const age of ages) {
		if (age === null) continue;
		fit.known += 1;
		if (age < range.min) fit.below += 1;
		else if (age > range.max) fit.above += 1;
		else fit.within += 1;
	}
	return fit;
}

export type Funnel = {
	total: number;
	/** Elfogadva, beleértve a részt vevőket is. */
	accepted: number;
	attended: number;
	rejected: number;
	waitlisted: number;
	cancelled: number;
	/** Még nem feldolgozott („jelentkezett”). */
	pending: number;
};

export function funnel(byStatus: StatusBreakdown): Funnel {
	const n = (status: keyof StatusBreakdown) => byStatus[status] ?? 0;
	const attended = n("ATTENDED");
	return {
		total:
			n("APPLIED") +
			n("ACCEPTED") +
			n("REJECTED") +
			n("ATTENDED") +
			n("WAITLISTED") +
			n("CANCELLED"),
		accepted: n("ACCEPTED") + attended,
		attended,
		rejected: n("REJECTED"),
		waitlisted: n("WAITLISTED"),
		cancelled: n("CANCELLED"),
		pending: n("APPLIED"),
	};
}

export type CompanyRow = {
	name: string;
	/** A cég programjaira beérkezett jelentkezések. */
	applications: number;
	programs: number;
};

/**
 * A cégek a programjaik száma szerint rangsorolva (egyezésnél a programjaikra
 * beérkezett jelentkezések, majd a név szerint). Kis- és nagybetű, fölösleges
 * szóköz nem számít; a leggyakoribb írásmód jelenik meg.
 */
export function companyRanking(
	events: { companyName: string | null; applications: number }[],
): CompanyRow[] {
	const groups = new Map<
		string,
		{
			applications: number;
			programs: number;
			spellings: Map<string, number>;
		}
	>();
	for (const event of events) {
		const name = event.companyName?.trim().replace(/\s+/g, " ");
		if (!name) continue;
		const key = name.toLocaleLowerCase("hu-HU");
		const group = groups.get(key) ?? {
			applications: 0,
			programs: 0,
			spellings: new Map(),
		};
		group.applications += event.applications;
		group.programs += 1;
		group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
		groups.set(key, group);
	}
	return [...groups.values()]
		.map((g) => ({
			name: [...g.spellings].sort((a, b) => b[1] - a[1])[0][0],
			applications: g.applications,
			programs: g.programs,
		}))
		.sort(
			(a, b) =>
				b.programs - a.programs ||
				b.applications - a.applications ||
				a.name.localeCompare(b.name, "hu"),
		);
}

export type OverviewApplicant = {
	birthYear: number | null;
	hometown: string | null;
	newsletter: boolean;
	applications: {
		eventId: string;
		eventFrom: Date;
		heardFromWhere: string | null;
	}[];
};

export type OverviewStats = {
	students: number;
	newsletter: number;
	returning: Returning;
	demographics: Demographics;
	channels: CountRow[];
};

/**
 * Összesítés a (nem törölt) diákokról; `range` esetén csak azokról, akik az
 * időszakban induló programra jelentkeztek, és csak az ottani jelentkezéseik
 * számítanak. Az életkor a diák legutóbbi (időszakbeli) programjának évéhez
 * viszonyít. Visszatérő: összes évnél, aki legalább két különböző programra
 * jelentkezett; egy évnél, aki az évet megelőző programra is jelentkezett.
 */
export function overviewStats(
	applicants: OverviewApplicant[],
	range: DateRange | null = null,
): OverviewStats {
	const scoped = applicants
		.map((applicant) => ({
			applicant,
			own: range
				? applicant.applications.filter(
						(x) =>
							x.eventFrom >= range.gte && x.eventFrom < range.lt,
					)
				: applicant.applications,
		}))
		.filter(({ own }) => !range || own.length > 0);

	const withApplications = scoped.filter(({ own }) => own.length > 0);
	const returning = withApplications.filter(({ applicant, own }) =>
		range
			? applicant.applications.some((x) => x.eventFrom < range.gte)
			: new Set(own.map((x) => x.eventId)).size >= 2,
	).length;

	const ages = scoped.map(({ applicant, own }) => {
		const latest = own.reduce<Date | null>(
			(max, x) => (max === null || x.eventFrom > max ? x.eventFrom : max),
			null,
		);
		return latest === null ? null : ageAtEvent(applicant.birthYear, latest);
	});

	return {
		students: scoped.length,
		newsletter: scoped.filter(({ applicant }) => applicant.newsletter)
			.length,
		returning: { returning, total: withApplications.length },
		demographics: {
			total: scoped.length,
			age: ageDistribution(ages),
			hometown: hometownDistribution(
				scoped.map(({ applicant }) => applicant.hometown),
			),
		},
		channels: orderByCount(
			hometownDistribution(
				scoped.flatMap(({ own }) => own.map((x) => x.heardFromWhere)),
			),
		),
	};
}

export type Overview = {
	programs: number;
	students: number;
	newsletter: number;
	/** Az összes cég, a programjaik száma szerint csökkenő sorrendben. */
	companies: CompanyRow[];
	/** Az értékelések kitöltöttsége; csak egy évnél, egyébként `null`. */
	completion: FeedbackCompletion | null;
	returning: Returning;
	demographics: Demographics;
	channels: CountRow[];
	/** A programok visszajelzései (résztvevő / mentor külön). */
	satisfaction: Satisfaction;
};

export type CompanyProgramRow = {
	id: string;
	name: string;
	from: Date;
	to: Date;
	capacity: number;
	applications: number;
	/** Résztvevői átlagértékelés; `null`, ha nincs pontszám. */
	rating: number | null;
};

export type CompanyDetail = {
	name: string;
	programs: number;
	/** Egyedi diákok a cég programjain. */
	students: number;
	/** Egyedi mentornevek: a több programon részt vevő mentor egyszer számít. */
	mentors: number;
	satisfaction: Satisfaction;
	rows: CompanyProgramRow[];
};

/** Egy cég mutatói a programjaiból; a sorok a legutóbbi program elől. */
export function companyDetail(
	name: string,
	events: (Omit<CompanyProgramRow, "rating"> & { mentors: string[] })[],
	students: number,
	feedback: (FeedbackScore & { eventId: string })[],
): CompanyDetail {
	const mentors = new Set(
		events.flatMap((e) => e.mentors.map((m) => m.trim().toLowerCase())),
	);
	mentors.delete("");
	return {
		name,
		programs: events.length,
		students,
		mentors: mentors.size,
		satisfaction: satisfactionByRole(feedback),
		rows: [...events]
			.sort((a, b) => b.from.getTime() - a.from.getTime())
			.map((event) => ({
				id: event.id,
				name: event.name,
				from: event.from,
				to: event.to,
				capacity: event.capacity,
				applications: event.applications,
				rating: satisfactionByRole(
					feedback.filter((f) => f.eventId === event.id),
				).PARTICIPANT.score.average,
			})),
	};
}

export type Completion = {
	responses: number;
	/** Hányan tölthették volna ki; `null`, ha nem tudjuk. */
	expected: number | null;
};

export type FeedbackCompletion = {
	participants: Completion;
	mentors: Completion;
};

/**
 * Az értékelések kitöltöttsége több programra. Résztvevőknél csak azok a
 * programok számítanak, ahol jelöltek „részt vett” jelentkezőt (az ő számuk az
 * elvárt kitöltés); mentoroknál azok, ahol meg vannak adva a mentorok.
 */
export function feedbackCompletion(
	events: { id: string; mentors: string[] }[],
	attended: ReadonlyMap<string, number>,
	responses: {
		eventId: string;
		role: "PARTICIPANT" | "MENTOR";
		count: number;
	}[],
): FeedbackCompletion {
	const count = (eventId: string, role: "PARTICIPANT" | "MENTOR") =>
		responses
			.filter((r) => r.eventId === eventId && r.role === role)
			.reduce((sum, r) => sum + r.count, 0);
	const out = {
		participants: { responses: 0, expected: 0 },
		mentors: { responses: 0, expected: 0 },
	};
	for (const event of events) {
		const present = attended.get(event.id) ?? 0;
		if (present > 0) {
			out.participants.expected += present;
			out.participants.responses += count(event.id, "PARTICIPANT");
		}
		const mentors = event.mentors.filter((m) => m.trim()).length;
		if (mentors > 0) {
			out.mentors.expected += mentors;
			out.mentors.responses += count(event.id, "MENTOR");
		}
	}
	const completion = (c: {
		responses: number;
		expected: number;
	}): Completion => ({
		responses: c.responses,
		expected: c.expected > 0 ? c.expected : null,
	});
	return {
		participants: completion(out.participants),
		mentors: completion(out.mentors),
	};
}

export type ProgramDetail = {
	id: string;
	name: string;
	capacity: number;
	/** A program már véget ért. */
	finished: boolean;
	funnel: Funnel;
	/** Jelentkezők / kapacitás; `null`, ha nincs kapacitás. */
	oversubscription: number | null;
	/** Visszatérő: egy korábban indult programra is jelentkezett. */
	returning: Returning;
	demographics: Demographics;
	/** `null`, ha a programnak nincs értelmezhető korosztálya. */
	ageFit: AgeFit | null;
	channels: CountRow[];
	satisfaction: Satisfaction;
	completion: { participants: Completion; mentors: Completion };
};
