import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationsSection } from "@/components/events/overview/applications-section";
import { applicantsHref, eventApplicantsHref } from "@/lib/events/links";
import { getEventOverview } from "@/lib/events/overview";
import { requireAdmin } from "@/lib/session";

type Props = PageProps<"/events/[id]/applicants">;

/** Munkamenet-ellenőrzés az adatolvasás előtt (a layout és az oldal párhuzamosan renderel). */
async function load(id: string) {
	await requireAdmin(eventApplicantsHref(id));
	return getEventOverview(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const overview = await load((await params).id);
	return {
		title: overview ? `Jelentkezők – ${overview.event.name}` : "Program",
	};
}

export default async function EventApplicantsPage({ params }: Props) {
	const { id } = await params;
	const overview = await load(id);
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
			/>
		</>
	);
}
