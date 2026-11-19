import "server-only";
import type { ApplicationStatus } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import {
	getHistoryEntries,
	HISTORY_PREVIEW_LIMIT,
	type HistoryEntry,
} from "@/lib/history/queries";
import { fullName } from "./format";

export type ApplicantDetailApplication = {
	id: string;
	receivedAt: Date;
	status: ApplicationStatus;
	heardFromWhere: string | null;
	heardFromWhom: string | null;
	solvedProblem: string | null;
	pastExpInProg: string | null;
	pastParticipationSkool: boolean;
	pastParticipationSkoolDesc: string | null;
	pastParticipationOther: string | null;
	foodPreference: string | null;
	comment: string | null;
	event: { id: string; name: string; from: Date; to: Date };
};

export type ApplicantHistoryEntry = HistoryEntry;

export type ApplicantDetail = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	firstName: string;
	lastName: string;
	birthYear: number | null;
	schoolName: string | null;
	hometown: string | null;
	phoneNumber: string | null;
	email: string | null;
	parentFirstName: string | null;
	parentLastName: string | null;
	parentMothersName: string | null;
	parentAddress: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	newsletter: boolean;
	/** Legfrissebb elöl (`receivedAt desc`). */
	applications: ApplicantDetailApplication[];
	/** Legfrissebb elöl, legfeljebb `HISTORY_PREVIEW_LIMIT`. */
	history: ApplicantHistoryEntry[];
};

export type ApplicantForEdit = {
	id: string;
	updatedAt: Date;
	lastName: string;
	firstName: string;
	birthYear: number | null;
	email: string | null;
	phoneNumber: string | null;
	schoolName: string | null;
	hometown: string | null;
	parentLastName: string | null;
	parentFirstName: string | null;
	parentMothersName: string | null;
	parentAddress: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	newsletter: boolean;
};

/**
 * A szerkesztő űrlap adatai (csak a szerkeszthető mezők + `updatedAt` az
 * ütközés-ellenőrzéshez). Ismeretlen vagy törölt jelentkezőnél `null`.
 */
export const getApplicantForEdit = cache(
	async (id: string): Promise<ApplicantForEdit | null> =>
		db.applicant.findFirst({
			where: { id, deletedAt: null },
			select: {
				id: true,
				updatedAt: true,
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
			},
		}),
);

/**
 * Egy jelentkező adatlapja az adatbázisból. Ismeretlen vagy törölt
 * (anonimizált) jelentkezőnél `null`. Kérésenként memoizált, így a
 * `generateMetadata` és az oldal egy lekérdezéssort használ.
 */
export const getApplicantDetail = cache(
	async (id: string): Promise<ApplicantDetail | null> => {
		const applicant = await db.applicant.findFirst({
			where: { id, deletedAt: null },
			select: {
				id: true,
				createdAt: true,
				updatedAt: true,
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
					orderBy: [{ receivedAt: "desc" }, { id: "asc" }],
					select: {
						id: true,
						receivedAt: true,
						status: true,
						heardFromWhere: true,
						heardFromWhom: true,
						solvedProblem: true,
						pastExpInProg: true,
						pastParticipationSkool: true,
						pastParticipationSkoolDesc: true,
						pastParticipationOther: true,
						foodPreference: true,
						comment: true,
						event: {
							select: {
								id: true,
								name: true,
								from: true,
								to: true,
							},
						},
					},
				},
			},
		});
		if (!applicant) return null;

		const history = await getHistoryEntries(
			{
				kind: "applicant",
				id: applicant.id,
				name: fullName(applicant),
				applications: applicant.applications.map((a) => ({
					id: a.id,
					programName: a.event.name,
				})),
			},
			HISTORY_PREVIEW_LIMIT,
		);

		return { ...applicant, history };
	},
);
