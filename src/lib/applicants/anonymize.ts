import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * GDPR-törlés: a jelentkező személyes adatait visszafordíthatatlanul
 * eltávolítja, a nem azonosító előzményeket (születési év, település,
 * jelentkezések programmal és státusszal) megtartja.
 *
 * History-konvenció: `tableName` az adatbázistábla neve (`@@map`, pl.
 * `applicant`, `application`), `recordId` a rekord id-ja, `fieldName` a
 * Prisma-mezőnév. A History-t író kódnak ugyanezeket az értékeket kell
 * használnia, különben a törlés nem tudja kitisztítani a régi értékeket.
 */

export const DELETED_FIRST_NAME = "Törölt";
export const DELETED_LAST_NAME = "jelentkező";

export const APPLICANT_TABLE = "applicant";
export const APPLICATION_TABLE = "application";

/** Az anonimizált jelentkezőre írt mezők (az időbélyegek és a végző nélkül). */
export const anonymizedApplicantData = {
	firstName: DELETED_FIRST_NAME,
	lastName: DELETED_LAST_NAME,
	email: null,
	phoneNumber: null,
	schoolName: null,
	parentFirstName: null,
	parentLastName: null,
	parentMothersName: null,
	parentAddress: null,
	parentEmail: null,
	parentPhone: null,
	newsletter: false,
} satisfies Prisma.ApplicantUpdateManyMutationInput;

/** A jelentkezések szabad szöveges válaszai, amelyek személyes adatot tartalmazhatnak. */
export const clearedApplicationText = {
	foodPreference: null,
	heardFromWhere: null,
	heardFromWhom: null,
	solvedProblem: null,
	pastExpInProg: null,
	pastParticipationOther: null,
	pastParticipationSkoolDesc: null,
	comment: null,
} satisfies Prisma.ApplicationUpdateManyMutationInput;

export class ApplicantsNotFoundError extends Error {
	constructor() {
		super("One or more applicants do not exist");
		this.name = "ApplicantsNotFoundError";
	}
}

type Db = Pick<PrismaClient, "$transaction">;

/**
 * Egy tranzakcióban anonimizálja a megadott jelentkezőket.
 * - Ismeretlen id → `ApplicantsNotFoundError`, semmi sem változik.
 * - Már törölt jelentkező → kimarad (nem hiba).
 * Visszaadja a most törölt jelentkezők számát.
 */
export async function anonymizeApplicants(
	db: Db,
	ids: readonly string[],
	actorUserId: string,
	now: Date = new Date(),
): Promise<{ deleted: number }> {
	const uniqueIds = [...new Set(ids)];

	return db.$transaction(async (tx) => {
		const found = await tx.applicant.findMany({
			where: { id: { in: uniqueIds } },
			select: { id: true, deletedAt: true },
		});
		if (found.length !== uniqueIds.length)
			throw new ApplicantsNotFoundError();

		const targets = found
			.filter((a) => a.deletedAt === null)
			.map((a) => a.id);
		if (targets.length === 0) return { deleted: 0 };

		await tx.applicant.updateMany({
			where: { id: { in: targets }, deletedAt: null },
			data: {
				...anonymizedApplicantData,
				deletedAt: now,
				deletedById: actorUserId,
				updatedById: actorUserId,
			},
		});

		const applications = await tx.application.findMany({
			where: { applicantId: { in: targets } },
			select: { id: true },
		});
		const applicationIds = applications.map((a) => a.id);

		if (applicationIds.length > 0) {
			await tx.application.updateMany({
				where: { id: { in: applicationIds } },
				data: { ...clearedApplicationText, updatedById: actorUserId },
			});
		}

		await tx.history.updateMany({
			where: {
				OR: [
					{ tableName: APPLICANT_TABLE, recordId: { in: targets } },
					...(applicationIds.length > 0
						? [
								{
									tableName: APPLICATION_TABLE,
									recordId: { in: applicationIds },
								},
							]
						: []),
				],
			},
			data: { oldValue: null, newValue: null },
		});

		await tx.history.createMany({
			data: targets.map((recordId) => ({
				tableName: APPLICANT_TABLE,
				fieldName: "deletedAt",
				recordId,
				oldValue: null,
				newValue: null,
				createdById: actorUserId,
				createdAt: now,
			})),
		});

		return { deleted: targets.length };
	});
}
