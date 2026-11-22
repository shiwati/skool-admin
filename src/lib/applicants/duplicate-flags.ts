import type { Prisma } from "@prisma/client";

/**
 * Same person = same name and email, ignoring case, accents and spacing.
 * Only flags candidates; merging is an admin decision.
 */
export function duplicateKey(
	lastName: string,
	firstName: string,
	email: string,
): string {
	return [lastName, firstName, email]
		.map((part) =>
			part
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "")
				.toLowerCase()
				.replace(/\s+/g, " ")
				.trim(),
		)
		.join("|");
}

type Tx = Pick<Prisma.TransactionClient, "applicant">;

/**
 * A duplikáció-jelző újraszámolása a megadott kulcsokra, miután jelentkező
 * került be, változott vagy kikerült: egy nem törölt jelentkező addig
 * jelölt, amíg egy másik nem törölt jelentkező is ugyanazt a kulcsot
 * viseli. Csak a ténylegesen változó sorokat írja, így a többi jelentkező
 * `updatedAt`-je (és a nyitott szerkesztő űrlapja) érintetlen marad.
 */
export async function recomputeDuplicateFlags(
	tx: Tx,
	keys: Iterable<string | null | undefined>,
): Promise<void> {
	const unique = new Set(
		[...keys].filter((key): key is string => Boolean(key)),
	);
	for (const key of unique) {
		const count = await tx.applicant.count({
			where: { duplicateKey: key, deletedAt: null },
		});
		await tx.applicant.updateMany({
			where: {
				duplicateKey: key,
				deletedAt: null,
				duplicateFlag: count <= 1,
			},
			data: { duplicateFlag: count > 1 },
		});
	}
}
