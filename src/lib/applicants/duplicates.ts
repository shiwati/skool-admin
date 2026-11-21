import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import {
	buildDuplicatePairs,
	pairKey,
	type DuplicateCandidate,
} from "./duplicate-pairs";
import type { DuplicateApplicant, DuplicatesResponse } from "./types";

export const duplicatesQuerySchema = z.object({
	/** Hány párt ugorjon át ("Kihagyás most"); körbeér a végén. */
	skip: z.coerce.number().int().min(0).max(10_000).default(0),
});

const applicantSelect = {
	id: true,
	createdAt: true,
	firstName: true,
	lastName: true,
	birthYear: true,
	schoolName: true,
	hometown: true,
	phoneNumber: true,
	email: true,
	parentFirstName: true,
	parentLastName: true,
	parentMothersName: true,
	parentAddress: true,
	parentEmail: true,
	parentPhone: true,
	newsletter: true,
	applications: {
		orderBy: { receivedAt: "desc" },
		select: {
			id: true,
			receivedAt: true,
			status: true,
			event: { select: { id: true, name: true } },
		},
	},
} as const;

/** Az eldöntetlen duplikátumpárok (azonosítók), stabil sorrendben. */
async function undecidedPairs() {
	const rows = await db.applicant.findMany({
		where: {
			duplicateFlag: true,
			deletedAt: null,
			duplicateKey: { not: null },
		},
		select: { id: true, duplicateKey: true, createdAt: true },
	});
	const candidates = rows as DuplicateCandidate[];
	const ids = candidates.map((c) => c.id);
	const dismissals = ids.length
		? await db.duplicateDismissal.findMany({
				where: { applicantAId: { in: ids }, applicantBId: { in: ids } },
				select: { applicantAId: true, applicantBId: true },
			})
		: [];
	return buildDuplicatePairs(
		candidates,
		new Set(dismissals.map((d) => pairKey(d.applicantAId, d.applicantBId))),
	);
}

/** Az eldöntetlen duplikátumpárok száma (a Jelentkezők oldal bannere). */
export async function countDuplicatePairs(): Promise<number> {
	return (await undecidedPairs()).length;
}

/** Az eldöntetlen duplikátumpárok közül a `skip`-edik, teljes adatokkal. */
export async function getDuplicatePair(
	skip: number,
): Promise<DuplicatesResponse> {
	const pairs = await undecidedPairs();
	if (pairs.length === 0) return { total: 0, index: 0, pair: null };

	const index = skip % pairs.length;
	const { aId, bId } = pairs[index];
	const applicants = await db.applicant.findMany({
		where: { id: { in: [aId, bId] } },
		select: applicantSelect,
	});
	const a = applicants.find((x) => x.id === aId);
	const b = applicants.find((x) => x.id === bId);
	// Concurrent change between the two queries: report the count only.
	if (!a || !b) return { total: pairs.length, index, pair: null };
	// Dates become ISO strings in the JSON response, matching the type.
	const json = (x: typeof a) => x as unknown as DuplicateApplicant;
	return { total: pairs.length, index, pair: { a: json(a), b: json(b) } };
}
