import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackSyncButton } from "@/components/feedback/feedback-sync-button";
import { FeedbackView } from "@/components/feedback/feedback-view";
import { eventEditHref } from "@/lib/events/links";
import { getEventOverview } from "@/lib/events/overview";
import { eventFeedbackHref } from "@/lib/feedback/format";
import {
	parseFeedbackQuery,
	getFeedback,
	lastFeedbackImport,
	listFeedback,
} from "@/lib/feedback/list";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

type Props = PageProps<"/events/[id]/feedback">;

/** Munkamenet-ellenőrzés az adatolvasás előtt (a layout és az oldal párhuzamosan renderel). */
async function load(id: string) {
	await requireAdmin(eventFeedbackHref(id));
	return getEventOverview(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const overview = await load((await params).id);
	return {
		title: overview ? `Visszajelzések – ${overview.event.name}` : "Program",
	};
}

export default async function EventFeedbackPage({
	params,
	searchParams,
}: Props) {
	const { id } = await params;
	const overview = await load(id);
	if (!overview) notFound();
	const { event } = overview;

	const parsed = parseFeedbackQuery(await searchParams);
	// A program fülén nincs időszakszűrő: egy kézzel beírt `period` se szűrjön rejtetten.
	const query = { ...parsed, eventId: event.id, period: undefined };
	const [data, lastImport, found] = await Promise.all([
		listFeedback(query),
		lastFeedbackImport(event.id),
		query.open ? getFeedback(query.open) : null,
	]);
	// Másik program visszajelzése ezen a fülön nem nyílik meg.
	const openItem = found?.eventId === event.id ? found : null;
	const hasSheet = Boolean(
		event.participantFeedbackSheetUrl || event.mentorFeedbackSheetUrl,
	);

	return (
		<FeedbackView
			data={data}
			state={{ ...query, eventId: undefined }}
			basePath={eventFeedbackHref(event.id)}
			openItem={openItem}
			header={
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-text-secondary">
						{hasSheet ? (
							<>
								Résztvevői sheet:{" "}
								{event.participantFeedbackSheetUrl
									? "megadva"
									: "nincs"}{" "}
								· mentori sheet:{" "}
								{event.mentorFeedbackSheetUrl
									? "megadva"
									: "nincs"}
								{lastImport && (
									<>
										{" "}
										· utolsó import{" "}
										{formatDateTime(lastImport)}
									</>
								)}
							</>
						) : (
							<>
								Ehhez a programhoz még nincs visszajelző sheet
								megadva.{" "}
								<Link
									href={eventEditHref(event.id)}
									className="text-info-fg underline underline-offset-2 hover:text-ink"
								>
									Megadás a szerkesztésnél
								</Link>
							</>
						)}
					</p>
					{hasSheet && <FeedbackSyncButton eventId={event.id} />}
				</div>
			}
		/>
	);
}
