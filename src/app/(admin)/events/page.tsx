import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/admin-shell/page-shell";
import { EventsView } from "@/components/events/events-view";
import type { EventListItem } from "@/components/events/events-table";
import { programYears } from "@/lib/events/program-years";
import { eventYearBounds } from "@/lib/dashboard/first-year";
import {
	countEventsByPhase,
	eventsQuerySchema,
	listEvents,
} from "@/lib/events/list";
import {
	parseEventListState,
	toEventsApiQuery,
} from "@/lib/events/list-params";
import { searchParamsToObject } from "@/lib/api/query";
import { toURLSearchParams } from "@/lib/list-state";

export const metadata: Metadata = { title: "Programok" };

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Access is enforced by the (admin) layout. Data is read on the server for
// the URL state; the client view only rewrites the URL.
export default async function EventsPage({ searchParams }: Props) {
	const state = parseEventListState(toURLSearchParams(await searchParams));
	// Same query the client would send; the URL state is already sanitised,
	// so this parse only applies defaults.
	const query = eventsQuerySchema.parse(
		searchParamsToObject(toEventsApiQuery(state)),
	);
	const now = new Date();

	const [page, counts, bounds] = await Promise.all([
		listEvents(query, now),
		countEventsByPhase(query, now),
		eventYearBounds(),
	]);
	// Same shape as the JSON API response (dates as ISO strings).
	const items = JSON.parse(JSON.stringify(page.items)) as EventListItem[];

	return (
		<PageShell>
			{/* useSearchParams in the view needs a Suspense boundary. */}
			<Suspense>
				<EventsView
					items={items}
					total={page.total}
					counts={counts}
					now={now.toISOString()}
					years={programYears(bounds, now)}
				/>
			</Suspense>
		</PageShell>
	);
}
