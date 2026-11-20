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

export type ApplicationSortKey =
	"receivedAt" | "lastName" | "birthYear" | "status";
export type SortOrder = "asc" | "desc";

export type ApplicationsQuery = {
	status: ApplicationStatus | null;
	sort: ApplicationSortKey;
	order: SortOrder;
	page: number;
	pageSize: number;
};

export function applicationsQueryString(query: ApplicationsQuery): string {
	const params = new URLSearchParams({
		sort: query.sort,
		order: query.order,
		page: String(query.page),
		pageSize: String(query.pageSize),
	});
	if (query.status) params.set("status", query.status);
	return params.toString();
}

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
