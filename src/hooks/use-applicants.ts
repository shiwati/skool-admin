"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, isAbortError } from "@/lib/api/client";
import type { ApplicantsPage } from "@/lib/applicants/types";

export type ApplicantsResult =
	| { status: "loading"; data?: undefined }
	| { status: "error"; data?: undefined }
	| { status: "success"; data: ApplicantsPage };

type Settled =
	| { status: "error"; data?: undefined }
	| { status: "success"; data: ApplicantsPage };

/**
 * Lekéri a `GET /api/applicants?<apiQuery>` oldalt. Új query esetén a
 * folyamatban lévő kérést megszakítja, így elavult válasz nem írhatja felül
 * a frisset. A `reload()` ugyanazt a kérést ismétli. Az `initial` (szerveren
 * lekért első oldal) esetén az első, azonos query-re nem indul kérés.
 */
export function useApplicants(
	apiQuery: string,
	initial?: { apiQuery: string; data: ApplicantsPage },
) {
	const [attempt, setAttempt] = useState(0);
	const requestKey = `${attempt}:${apiQuery}`;
	// The result is tagged with the request it answers; anything else is
	// still loading, so no state has to be reset when the query changes.
	const [settled, setSettled] = useState<
		{ key: string; result: Settled } | undefined
	>(() =>
		initial
			? {
					key: `0:${initial.apiQuery}`,
					result: { status: "success", data: initial.data },
				}
			: undefined,
	);

	useEffect(() => {
		// Already answered (e.g. by the server-rendered first page).
		if (settled?.key === requestKey) return;
		const controller = new AbortController();
		apiFetch<ApplicantsPage>(`/api/applicants?${apiQuery}`, {
			signal: controller.signal,
		})
			.then((data) => {
				if (!controller.signal.aborted)
					setSettled({
						key: requestKey,
						result: { status: "success", data },
					});
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted || isAbortError(error)) return;
				// 401: apiFetch is already redirecting to the login page.
				if (error instanceof ApiError && error.status === 401) return;
				setSettled({ key: requestKey, result: { status: "error" } });
			});
		return () => controller.abort();
		// `settled` is only read to skip a request that is already answered.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apiQuery, requestKey]);

	const reload = useCallback(() => setAttempt((n) => n + 1), []);
	const result: ApplicantsResult =
		settled?.key === requestKey ? settled.result : { status: "loading" };

	return { ...result, reload };
}
