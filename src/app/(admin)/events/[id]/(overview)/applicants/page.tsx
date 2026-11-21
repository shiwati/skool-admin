import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationsSection } from "@/components/events/overview/applications-section";
import { loadEventApplicationsPage } from "@/lib/events/applications-list";
import {
	parseApplicationsParams,
	type ApplicationsView,
} from "@/lib/events/applications-params";
import { applicantsHref, eventApplicantsHref } from "@/lib/events/links";
import { getEventOverview } from "@/lib/events/overview";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/session";

type Props = PageProps<"/events/[id]/applicants">;

/** Munkamenet-ellenőrzés az adatolvasás előtt (a layout és az oldal párhuzamosan renderel). */
async function load(id: string) {
	await requireAdmin(eventApplicantsHref(id));
	return getEventOverview(id);
}

/** Az URL nézetének oldala; hiba esetén a kliens a szokásos API-hívással próbálkozik. */
async function loadInitial(id: string, view: ApplicationsView) {
	// Outside the try: the login redirect must not be swallowed.
	await requireAdmin(eventApplicantsHref(id));
	try {
		return await loadEventApplicationsPage(id, view);
	} catch (error) {
		logger.error({ err: error }, "Initial event applications load failed");
		return undefined;
	}
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const overview = await load((await params).id);
	return {
		title: overview ? `Jelentkezők – ${overview.event.name}` : "Program",
	};
}

/** A Next `searchParams`-a → `URLSearchParams` (ismételt kulcsból az első). */
function toSearchParams(
	searchParams: Record<string, string | string[] | undefined>,
) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		const first = [value ?? []].flat()[0];
		if (first !== undefined) params.set(key, first);
	}
	return params;
}

export default async function EventApplicantsPage({
	params,
	searchParams,
}: Props) {
	const { id } = await params;
	const view = parseApplicationsParams(toSearchParams(await searchParams));
	const [overview, initial] = await Promise.all([
		load(id),
		loadInitial(id, view),
	]);
	if (!overview) notFound();
	const { event, counts } = overview;

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-text-secondary">
					A program jelentkezései. Jelöld ki a sorokat a státusz
					tömeges állításához.
				</p>
				<Link
					href={applicantsHref(event.id)}
					className="inline-flex items-center gap-1.5 text-sm text-info-fg underline underline-offset-2 hover:text-ink"
				>
					Megnyitás a Jelentkezők listában
					<ExternalLink aria-hidden="true" className="size-3.5" />
				</Link>
			</div>
			<ApplicationsSection
				eventId={event.id}
				capacity={event.capacity}
				counts={counts}
				applicationSheetUrl={event.applicationSheetUrl}
				initial={initial}
			/>
		</>
	);
}
