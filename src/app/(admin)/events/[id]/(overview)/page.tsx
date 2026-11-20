import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailsCard } from "@/components/events/overview/event-details-card";
import { EventHistoryCard } from "@/components/events/overview/event-history-card";
import { KpiCard } from "@/components/events/overview/kpi-card";
import { PeopleCard } from "@/components/events/overview/people-card";
import { SheetSourceCard } from "@/components/events/overview/sheet-source-card";
import { StatusBreakdown } from "@/components/events/overview/status-breakdown";
import { formatCount } from "@/lib/applicants/format";
import { demandRatio, formatRatio, ratioBadgeClass } from "@/lib/events/format";
import { eventHref } from "@/lib/events/links";
import { getEventOverview } from "@/lib/events/overview";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

type Props = PageProps<"/events/[id]">;

/** Munkamenet-ellenőrzés az adatolvasás előtt (a layout és az oldal párhuzamosan renderel). */
async function load(id: string) {
	await requireAdmin(eventHref(id));
	return getEventOverview(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const overview = await load((await params).id);
	return { title: overview?.event.name ?? "Program" };
}

export default async function EventOverviewPage({ params }: Props) {
	const { id } = await params;
	const overview = await load(id);
	if (!overview) notFound();
	const { event, counts, history } = overview;

	const ratio = demandRatio(counts.total, event.capacity);
	const full = event.capacity > 0 && counts.ACCEPTED >= event.capacity;

	return (
		<>
			<dl className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
				<KpiCard
					label="Férőhely"
					value={
						event.capacity > 0 ? formatCount(event.capacity) : "—"
					}
				/>
				<KpiCard label="Jelentkezett" value={formatCount(counts.total)}>
					{ratio !== null && (
						<span
							className={cn(
								"rounded-full px-2 font-mono text-xs leading-5 font-medium",
								ratioBadgeClass(ratio),
							)}
						>
							<span className="sr-only">Túljelentkezés: </span>
							{formatRatio(ratio)}
						</span>
					)}
				</KpiCard>
				<KpiCard label="Elfogadva" value={formatCount(counts.ACCEPTED)}>
					{event.capacity > 0 && (
						<span className="text-sm text-text-secondary">
							/ {formatCount(event.capacity)}
							{full && " – betelt"}
						</span>
					)}
				</KpiCard>
				<KpiCard
					label="Várólista"
					value={formatCount(counts.WAITLISTED)}
				>
					<span className="text-sm text-text-secondary">
						· {formatCount(counts.APPLIED)} új
					</span>
				</KpiCard>
			</dl>

			<div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="flex min-w-0 flex-col gap-5">
					<EventDetailsCard event={event} />
					<PeopleCard
						instructor={event.instructor}
						mentors={event.mentors}
					/>
				</div>
				<aside
					className="flex min-w-0 flex-col gap-5"
					aria-label="Kiegészítő adatok"
				>
					<StatusBreakdown eventId={event.id} counts={counts} />
					<SheetSourceCard
						eventId={event.id}
						applicationSheetUrl={event.applicationSheetUrl}
					/>
					<EventHistoryCard eventId={event.id} entries={history} />
				</aside>
			</div>
		</>
	);
}
