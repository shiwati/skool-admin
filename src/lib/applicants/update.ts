import "server-only";
import type { PrismaClient } from "@prisma/client";
import { APPLICANT_TABLE } from "./anonymize";
import { duplicateKey, recomputeDuplicateFlags } from "./duplicate-flags";
import type { ApplicantUpdate } from "./edit-schema";

export class ApplicantNotFoundError extends Error {
	constructor() {
		super("Applicant does not exist");
		this.name = "ApplicantNotFoundError";
	}
}

/** A jelentkezőt a betöltés óta más módosította. */
export class ApplicantConflictError extends Error {
	constructor() {
		super("Applicant was modified concurrently");
		this.name = "ApplicantConflictError";
	}
}

export type FieldChange = {
	field: keyof ApplicantUpdate;
	oldValue: string | null;
	newValue: string | null;
};

const FIELDS = [
	"lastName",
	"firstName",
	"birthYear",
	"email",
	"phoneNumber",
	"schoolName",
	"hometown",
	"parentLastName",
	"parentFirstName",
	"parentMothersName",
	"parentAddress",
	"parentEmail",
	"parentPhone",
	"newsletter",
] as const satisfies readonly (keyof ApplicantUpdate)[];

const DUPLICATE_KEY_FIELDS = new Set(["lastName", "firstName", "email"]);

/** History-érték: `null` marad, szám és logikai szövegként. */
function stringify(value: string | number | boolean | null): string | null {
	return value === null ? null : String(value);
}

/** A ténylegesen megváltozott mezők, régi és új értékkel. */
export function diffApplicant(
	current: { [K in keyof ApplicantUpdate]: ApplicantUpdate[K] | null },
	next: ApplicantUpdate,
): FieldChange[] {
	const changes: FieldChange[] = [];
	for (const field of FIELDS) {
		const oldValue = stringify(current[field]);
		const newValue = stringify(next[field]);
		if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
	}
	return changes;
}

type Db = Pick<PrismaClient, "$transaction">;

/**
 * Egy tranzakcióban menti a jelentkező adatait, mezőnként naplóz a
 * History-ba, és rendben tartja a duplikátum-kulcsot és -jelzéseket.
 * - Ismeretlen vagy törölt jelentkező → `ApplicantNotFoundError`.
 * - A betöltés óta módosult (`updatedAt` eltér) → `ApplicantConflictError`.
 */
export async function updateApplicant(
	db: Db,
	id: string,
	data: ApplicantUpdate,
	expectedUpdatedAt: Date,
	actorUserId: string,
): Promise<{ updatedAt: Date; changed: number }> {
	return db.$transaction(async (tx) => {
		const current = await tx.applicant.findFirst({
			where: { id, deletedAt: null },
			select: {
				lastName: true,
				firstName: true,
				birthYear: true,
				email: true,
				phoneNumber: true,
				schoolName: true,
				hometown: true,
				parentLastName: true,
				parentFirstName: true,
				parentMothersName: true,
				parentAddress: true,
				parentEmail: true,
				parentPhone: true,
				newsletter: true,
				duplicateKey: true,
				updatedAt: true,
			},
		});
		if (!current) throw new ApplicantNotFoundError();
		if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
			throw new ApplicantConflictError();
		}

		const changes = diffApplicant(current, data);
		if (changes.length === 0) {
			return { updatedAt: current.updatedAt, changed: 0 };
		}

		const keyChanged = changes.some((c) =>
			DUPLICATE_KEY_FIELDS.has(c.field),
		);
		const newKey = keyChanged
			? duplicateKey(data.lastName, data.firstName, data.email)
			: null;

		const written = await tx.applicant.updateMany({
			// Compare-and-set: a concurrent save in between makes this match nothing.
			where: { id, deletedAt: null, updatedAt: current.updatedAt },
			data: {
				...Object.fromEntries(
					changes.map((c) => [c.field, data[c.field]]),
				),
				...(keyChanged ? { duplicateKey: newKey } : {}),
				updatedById: actorUserId,
			},
		});
		if (written.count === 0) throw new ApplicantConflictError();

		await tx.history.createMany({
			data: changes.map((c) => ({
				tableName: APPLICANT_TABLE,
				fieldName: c.field,
				recordId: id,
				oldValue: c.oldValue,
				newValue: c.newValue,
				createdById: actorUserId,
			})),
		});

		if (keyChanged) {
			await recomputeDuplicateFlags(tx, [current.duplicateKey, newKey]);
		}

		const saved = await tx.applicant.findUniqueOrThrow({
			where: { id },
			select: { updatedAt: true },
		});
		return { updatedAt: saved.updatedAt, changed: changes.length };
	});
}
