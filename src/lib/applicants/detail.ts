import "server-only";
import type { ApplicationStatus } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import { APPLICANT_TABLE, APPLICATION_TABLE } from "./anonymize";

/** Ennyi változástörténet-bejegyzés jelenik meg az adatlapon. */
export const HISTORY_LIMIT = 20;

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

export type ApplicantHistoryEntry = {
	id: string;
	/** A módosító neve; `null` = rendszer (vagy törölt felhasználó). */
	actor: string | null;
	field: string;
	/** Jelentkezés-bejegyzésnél a program neve. */
	programName: string | null;
	oldValue: string | null;
	newValue: string | null;
	createdAt: Date;
};

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
	/** Legfrissebb elöl, legfeljebb `HISTORY_LIMIT`. */
	history: ApplicantHistoryEntry[];
};

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

		const programByApplication = new Map(
			applicant.applications.map((a) => [a.id, a.event.name]),
		);
		const applicationIds = [...programByApplication.keys()];

		const rows = await db.history.findMany({
			where: {
				OR: [
					{ tableName: APPLICANT_TABLE, recordId: applicant.id },
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
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: HISTORY_LIMIT,
			select: {
				id: true,
				tableName: true,
				fieldName: true,
				recordId: true,
				oldValue: true,
				newValue: true,
				createdAt: true,
				createdBy: { select: { name: true } },
			},
		});

		return {
			...applicant,
			history: rows.map((row) => ({
				id: row.id,
				actor: row.createdBy?.name ?? null,
				field: row.fieldName,
				programName:
					row.tableName === APPLICATION_TABLE
						? (programByApplication.get(row.recordId) ?? null)
						: null,
				oldValue: row.oldValue,
				newValue: row.newValue,
				createdAt: row.createdAt,
			})),
		};
	},
);
