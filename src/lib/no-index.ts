import type { Metadata } from "next";

/**
 * The app is an internal admin tool: search engines must never index or
 * cache it. The header covers every response (pages, API, static files);
 * the metadata adds the matching `<meta name="robots">` to every page.
 * Don't add a `robots.txt` that disallows crawling: a crawler that may not
 * fetch a page never sees its `noindex`.
 */
export const NO_INDEX_HEADER = {
	key: "X-Robots-Tag",
	value: "noindex, nofollow, noarchive",
} as const;

export const noIndexRobots: Metadata["robots"] = {
	index: false,
	follow: false,
	nocache: true,
	googleBot: { index: false, follow: false, noimageindex: true },
};
