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
 * a frisset. A `reload()` ugyanazt a kérést ismétli.
 */
export function useApplicants(apiQuery: string) {
	const [attempt, setAttempt] = useState(0);
	const requestKey = `${attempt}:${apiQuery}`;
	// The result is tagged with the request it answers; anything else is
	// still loading, so no state has to be reset when the query changes.
	const [settled, setSettled] = useState<{ key: string; result: Settled }>();

	useEffect(() => {
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
	}, [apiQuery, requestKey]);

	const reload = useCallback(() => setAttempt((n) => n + 1), []);
	const result: ApplicantsResult =
		settled?.key === requestKey ? settled.result : { status: "loading" };

	return { ...result, reload };
}
