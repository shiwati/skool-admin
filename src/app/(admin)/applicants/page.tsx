import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/admin-shell/page-shell";
import { searchParamsToObject } from "@/lib/api/query";
import { applicantsQuerySchema, listApplicants } from "@/lib/applicants/list";
import { parseListState, toApiQuery } from "@/lib/applicants/list-params";
import type { ApplicantsPage as ApplicantsPageData } from "@/lib/applicants/types";
import { logger } from "@/lib/logger";
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
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		for (const v of [value ?? []].flat()) params.append(key, v);
	}
	const apiQuery = toApiQuery(parseListState(params));
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

// Access is enforced by the (admin) layout.
export default async function ApplicantsPage({ searchParams }: Props) {
	const initial = await loadInitial(await searchParams);
	return (
		<PageShell>
			{/* useSearchParams in the view needs a Suspense boundary. */}
			<Suspense>
				<ApplicantsView initial={initial} />
			</Suspense>
		</PageShell>
	);
}
