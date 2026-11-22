"use client";

import type { ApplicantsPage } from "@/lib/applicants/types";
import { usePagedQuery, type PagedResult } from "./use-paged-query";

export type ApplicantsResult = PagedResult<ApplicantsPage>;

/**
 * A `GET /api/applicants?<apiQuery>` oldala (lásd `usePagedQuery`). Az
 * `initial` a szerveren lekért első oldal.
 */
export function useApplicants(
	apiQuery: string,
	initial?: { apiQuery: string; data: ApplicantsPage },
) {
	const { result, reload } = usePagedQuery<ApplicantsPage>(
		`/api/applicants?${apiQuery}`,
		initial && {
			url: `/api/applicants?${initial.apiQuery}`,
			data: initial.data,
		},
	);
	return { ...result, reload };
}
