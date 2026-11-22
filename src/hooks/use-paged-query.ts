"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, isAbortError } from "@/lib/api/client";

export type PagedResult<T> =
	| { status: "loading"; data?: undefined }
	| { status: "error"; data?: undefined }
	| { status: "success"; data: T };

type Settled<T> = Exclude<PagedResult<T>, { status: "loading" }>;

/** A szerveren már lekért adat és annak URL-je. */
export type InitialPage<T> = { url: string; data: T };

/**
 * Lekéri a `url` JSON-válaszát (egy lista oldalát).
 *
 * - Új URL esetén a folyamatban lévő kérést megszakítja, így elavult válasz
 *   nem írhatja felül a frisset.
 * - A `reload()` ugyanazt a kérést ismétli.
 * - Az `initial` (szerveren lekért oldal) azonos URL-re nem indít kérést.
 *   Ha a szerver új `initial`-t küld (pl. `router.refresh()` után), azt
 *   veszi át; ha az eltűnik, kliensoldalon kér újra.
 * - A `requestKey` az aktuális kérést azonosítja (pl. a kijelölés ehhez
 *   köthető, így minden nézetváltás törli).
 */
export function usePagedQuery<T>(url: string, initial?: InitialPage<T>) {
	const [attempt, setAttempt] = useState(0);
	const requestKey = `${attempt}:${url}`;
	// The result is tagged with the request it answers; anything else is
	// still loading, so no state has to be reset when the URL changes.
	const [settled, setSettled] = useState<
		{ key: string; result: Settled<T> } | undefined
	>(() => (initial ? settledFrom(0, initial) : undefined));

	// Fresh server data: adopt it during render. Compared by the data's
	// identity, so a wrapper object rebuilt on each render is fine.
	const [seen, setSeen] = useState(initial?.data);
	if (initial?.data !== seen) {
		setSeen(initial?.data);
		if (initial) setSettled(settledFrom(attempt, initial));
		else setAttempt((n) => n + 1);
	}

	useEffect(() => {
		// Already answered (e.g. by the server-rendered first page).
		if (settled?.key === requestKey) return;
		const controller = new AbortController();
		apiFetch<T>(url, { signal: controller.signal })
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
	}, [url, requestKey]);

	const reload = useCallback(() => setAttempt((n) => n + 1), []);
	const result: PagedResult<T> =
		settled?.key === requestKey ? settled.result : { status: "loading" };

	return { result, requestKey, reload };
}

function settledFrom<T>(attempt: number, initial: InitialPage<T>) {
	return {
		key: `${attempt}:${initial.url}`,
		result: { status: "success", data: initial.data } as Settled<T>,
	};
}
