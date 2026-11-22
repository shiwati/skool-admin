import type { Event } from "@prisma/client";

/**
 * A hajtogatott keresőoszlopok (triggerek töltik, lásd docs/data-and-db.md,
 * „Keresés”) csak `where`-ben kellenek. A teljes sort visszaadó lekérdezések
 * ezzel hagyják ki őket, így az API-válaszok és a propok nem változnak.
 */
export const APPLICANT_SEARCH_OMIT = {
	searchText: true,
	hometownSearch: true,
} as const;

export const EVENT_SEARCH_OMIT = {
	nameSearch: true,
	locationSearch: true,
	companySearch: true,
	instructorSearch: true,
} as const;

/** Egy program a keresőoszlopok nélkül (ahogy a lekérdezések visszaadják). */
export type EventRecord = Omit<Event, keyof typeof EVENT_SEARCH_OMIT>;
