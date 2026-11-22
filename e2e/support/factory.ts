import type {
	Applicant,
	Application,
	ApplicationStatus,
	Event,
	History,
	Prisma,
	PrismaClient,
} from "@prisma/client";
import {
	duplicateKey,
	recomputeDuplicateFlags,
} from "../../src/lib/applicants/duplicate-flags";

/**
 * Adatgyár az író E2E tesztekhez: minden teszt a saját, egyedi nevű és
 * azonosítójú adatát hozza létre, így nem nyúl a közös fixture-adathoz
 * (`fixtures.ts`), és a párhuzamos tesztek nem látják egymás sorait.
 * Takarítás nincs: a setup minden futás elején kiüríti az adatbázist.
 */

export type Factory = ReturnType<typeof createFactory>;

const day = (iso: string, plusDays = 0) =>
	new Date(Date.parse(`${iso}T09:00:00.000Z`) + plusDays * 86_400_000);

/**
 * @param token tesztenként egyedi, csak betű és szám (lásd `test.ts`); a
 *   nevekbe is bekerül, így a listán `q=<token>` csak a teszt sorait adja.
 */
export function createFactory(db: PrismaClient, token: string) {
	let n = 0;
	const next = () => `${token}x${++n}`;

	async function event(
		overrides: Partial<Prisma.EventUncheckedCreateInput> = {},
	): Promise<Event> {
		const tag = next();
		return db.event.create({
			data: {
				id: `f-event-${tag}`,
				name: `Gyar program ${tag}`,
				// Far from today, so the phase never flips during a run.
				from: day("2030-01-10"),
				to: day("2030-01-12"),
				capacity: 20,
				location: "Budapest",
				...overrides,
			},
		});
	}

	async function applicant(
		overrides: Partial<Prisma.ApplicantUncheckedCreateInput> = {},
	): Promise<Applicant> {
		const tag = next();
		const data = {
			id: `f-applicant-${tag}`,
			lastName: `Gyar${tag}`,
			firstName: "Teszt",
			email: `${tag}@example.com`.toLowerCase(),
			birthYear: 2010,
			hometown: "Szeged",
			...overrides,
		};
		const key = data.email
			? duplicateKey(data.lastName, data.firstName, data.email)
			: null;
		// Same duplicate detection as the sheet import and the seed.
		return db.$transaction(async (tx) => {
			const created = await tx.applicant.create({
				data: { ...data, duplicateKey: key },
			});
			await recomputeDuplicateFlags(tx, [key]);
			return tx.applicant.findUniqueOrThrow({
				where: { id: created.id },
			});
		});
	}

	/**
	 * Sok jelentkező egyszerre (pl. több oldalas exporthoz), duplikátum-kulcs
	 * nélkül; mind egyedi nevű.
	 */
	async function applicants(count: number): Promise<string[]> {
		const data = Array.from({ length: count }, () => {
			const tag = next();
			return {
				id: `f-applicant-${tag}`,
				lastName: `Gyar${tag}`,
				firstName: "Tomeges",
				email: `${tag}@example.com`.toLowerCase(),
			};
		});
		await db.applicant.createMany({ data });
		return data.map((a) => a.id);
	}

	async function application({
		applicant,
		event,
		status = "APPLIED",
		...overrides
	}: {
		applicant: Pick<Applicant, "id">;
		event: Pick<Event, "id">;
		status?: ApplicationStatus;
	} & Partial<Prisma.ApplicationUncheckedCreateInput>): Promise<Application> {
		return db.application.create({
			data: {
				id: `f-application-${next()}`,
				applicantId: applicant.id,
				eventId: event.id,
				status,
				receivedAt: day("2029-12-01"),
				...overrides,
			},
		});
	}

	/**
	 * Két jelentkező ugyanazzal a névvel és e-maillel: a duplikátum-jelző
	 * mindkettőn be van állítva, mint egy importált duplikátumnál.
	 */
	async function duplicatePair(
		overrides: Partial<Prisma.ApplicantUncheckedCreateInput> = {},
	): Promise<[Applicant, Applicant]> {
		const tag = next();
		const shared = {
			lastName: `Gyar${tag}`,
			firstName: "Iker",
			email: `${tag}@example.com`.toLowerCase(),
			...overrides,
		};
		// The review dialog shows the older one as "A · korábbi".
		const first = await applicant({
			...shared,
			hometown: "Pecs",
			createdAt: new Date(Date.now() - 60_000),
		});
		const second = await applicant({ ...shared, hometown: "Gyor" });
		return [
			await db.applicant.findUniqueOrThrow({ where: { id: first.id } }),
			second,
		];
	}

	/** Egy korábbi változásnapló-bejegyzés (pl. egy e-mail-cím módosítása). */
	async function history(
		data: Pick<
			Prisma.HistoryUncheckedCreateInput,
			"tableName" | "recordId" | "fieldName" | "oldValue" | "newValue"
		>,
	): Promise<History> {
		return db.history.create({
			data: {
				id: `f-history-${next()}`,
				createdById: "e2e-admin",
				...data,
			},
		});
	}

	return {
		token,
		event,
		applicant,
		applicants,
		application,
		duplicatePair,
		history,
	};
}
