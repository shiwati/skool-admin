import { apiFetch } from "./client";

/** Az API legnagyobb lapmérete. */
export const FETCH_PAGE_SIZE = 100;

/**
 * Egy lapozott lista összes elemét összegyűjti: az `urlForPage` adja az adott
 * oldal címét (`pageSize` = `FETCH_PAGE_SIZE`).
 */
export async function fetchAllPages<T>(
	urlForPage: (page: number, pageSize: number) => string,
	signal: AbortSignal,
	onProgress?: (loaded: number, total: number) => void,
): Promise<T[]> {
	const all: T[] = [];
	for (let page = 1; ; page += 1) {
		const data = await apiFetch<{ items: T[]; total: number }>(
			urlForPage(page, FETCH_PAGE_SIZE),
			{ signal },
		);
		all.push(...data.items);
		onProgress?.(Math.min(all.length, data.total), data.total);
		if (data.items.length === 0 || all.length >= data.total) return all;
	}
}
