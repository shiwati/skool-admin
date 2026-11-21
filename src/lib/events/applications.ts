import type { ApplicationStatus } from "@/lib/applicants/types";

/** Egy sor az esemény jelentkezéseinek listájában (`GET /api/events/[id]/applicants`). */
export type EventApplicationItem = {
	id: string;
	status: ApplicationStatus;
	receivedAt: string;
	applicant: {
		id: string;
		firstName: string;
		lastName: string;
		email: string | null;
		birthYear: number | null;
		hometown: string | null;
		schoolName: string | null;
		duplicateFlag: boolean;
		newsletter: boolean;
	};
};

export type EventApplicationsPage = {
	items: EventApplicationItem[];
	total: number;
	page: number;
	pageSize: number;
};

/** A szerveren előtöltött oldal, és az API-query, amire válaszol. */
export type InitialApplications = {
	apiQuery: string;
	data: EventApplicationsPage;
};

/** Az elfogadottak száma a művelet után, ha `ids` mind `status` státuszba kerül. */
export function acceptedAfter(
	accepted: number,
	selected: readonly { status: ApplicationStatus }[],
	status: ApplicationStatus,
): number {
	const wasAccepted = selected.filter((a) => a.status === "ACCEPTED").length;
	const willBe = status === "ACCEPTED" ? selected.length : 0;
	return accepted - wasAccepted + willBe;
}
