import "server-only";
import type { PrismaClient } from "@prisma/client";
import { DuplicateApplicantNotFoundError, NotDuplicatesError } from "./merge";
import { APPLICANT_TABLE, historyRow } from "@/lib/history/write";

type Db = Pick<
	PrismaClient,
	"applicant" | "duplicateDismissal" | "history" | "$transaction"
>;

/**
 * "Nem duplikáció": a pár többé nem jelenik meg a duplikáció-ellenőrzésben.
 * A döntés csak erre a párra szól; egy később érkező, azonos kulcsú
 * jelentkező bármelyikükkel új párt alkot. A `duplicateFlag` nem változik.
 * A párt id szerint rendezve tárolja; ismételt hívás nem hiba.
 */
export async function dismissDuplicatePair(
	db: Db,
	pair: readonly [string, string],
	actorUserId: string,
): Promise<void> {
	const [applicantAId, applicantBId] = pair.toSorted();
	const applicants = await db.applicant.findMany({
		where: { id: { in: [applicantAId, applicantBId] }, deletedAt: null },
		select: { duplicateKey: true },
	});
	if (applicants.length !== 2) throw new DuplicateApplicantNotFoundError();
	const [x, y] = applicants;
	if (!x.duplicateKey || x.duplicateKey !== y.duplicateKey) {
		throw new NotDuplicatesError();
	}

	await db.$transaction([
		db.duplicateDismissal.createMany({
			data: [{ applicantAId, applicantBId, createdById: actorUserId }],
			skipDuplicates: true,
		}),
		db.history.create({
			data: historyRow(APPLICANT_TABLE, actorUserId, {
				recordId: applicantAId,
				fieldName: "duplicate_dismissed",
				oldValue: null,
				newValue: applicantBId,
			}),
		}),
	]);
}
