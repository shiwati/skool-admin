import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/admin-shell/page-shell";
import { searchParamsToObject } from "@/lib/api/query";
import { toURLSearchParams } from "@/lib/list-state";
import { countDuplicatePairs } from "@/lib/applicants/duplicates";
import { applicantsQuerySchema, listApplicants } from "@/lib/applicants/list";
import { parseListState, toApiQuery } from "@/lib/applicants/list-params";
import type { ApplicantsPage as ApplicantsPageData } from "@/lib/applicants/types";
import { logger } from "@/lib/logger";
import { listEventOptions } from "@/lib/events/list";
import { programYears } from "@/lib/events/program-years";
import { eventYearBounds } from "@/lib/dashboard/first-year";
import {
	ApplicantsView,
	type InitialApplicants,
} from "@/components/applicants/applicants-view";

export const metadata: Metadata = { title: "Jelentkezők" };

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Az URL-ben lévő (vagy alapértelmezett) szűrőkkel az első oldalt már a
 * szerver lekéri, így nincs üres/töltő állapot. Hiba esetén a kliens
 * a szokásos API-hívással próbálkozik.
 */
async function loadInitial(
	searchParams: Awaited<Props["searchParams"]>,
): Promise<InitialApplicants | undefined> {
	const apiQuery = toApiQuery(
		parseListState(toURLSearchParams(searchParams)),
	);
	const parsed = applicantsQuerySchema.safeParse(
		searchParamsToObject(apiQuery),
	);
	if (!parsed.success) return undefined;
	try {
		const page = await listApplicants(parsed.data);
		// Same shape as the JSON API response (dates as ISO strings).
		const data = JSON.parse(JSON.stringify(page)) as ApplicantsPageData;
		return { apiQuery: apiQuery.toString(), data };
	} catch (error) {
		logger.error({ err: error }, "Initial applicants load failed");
		return undefined;
	}
}

/**
 * Kiegészítő adat a szerverről; hiba esetén `fallback` (a Program szűrő
 * üres marad, illetve a duplikáció-banner nem jelenik meg).
 */
async function optional<T>(load: Promise<T>, fallback: T, what: string) {
	try {
		return await load;
	} catch (error) {
		logger.error({ err: error }, `Initial ${what} load failed`);
		return fallback;
	}
}

// Access is enforced by the (admin) layout.
export default async function ApplicantsPage({ searchParams }: Props) {
	const [initial, bounds, events, duplicateCount] = await Promise.all([
		loadInitial(await searchParams),
		eventYearBounds(),
		optional(listEventOptions(), [], "event options"),
		optional(countDuplicatePairs(), null, "duplicate count"),
	]);
	return (
		<PageShell>
			{/* useSearchParams in the view needs a Suspense boundary. */}
			<Suspense>
				<ApplicantsView
					initial={initial}
					years={programYears(bounds)}
					events={events}
					duplicateCount={duplicateCount}
				/>
			</Suspense>
		</PageShell>
	);
}
