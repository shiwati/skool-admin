import Link from "next/link";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import { eventApplicantsHref } from "@/lib/events/links";
import type { StatusCounts } from "@/lib/events/list";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

const ORDER: ApplicationStatus[] = [
	"APPLIED",
	"ACCEPTED",
	"WAITLISTED",
	"ATTENDED",
	"REJECTED",
	"CANCELLED",
];

export function StatusBreakdown({
	eventId,
	counts,
}: {
	eventId: string;
	counts: StatusCounts;
}) {
	const summary = ORDER.map(
		(status) => `${STATUS_LABELS[status]}: ${formatCount(counts[status])}`,
	).join(", ");

	return (
		<DetailCard
			title="Jelentkezők státusz szerint"
			subtitle={`${formatCount(counts.total)} jelentkezés`}
		>
			{counts.total === 0 ? (
				<p className="text-sm text-text-secondary">
					Még nincs jelentkező ehhez a programhoz.
				</p>
			) : (
				<div
					role="img"
					aria-label={summary}
					className="flex h-3 overflow-hidden rounded-full bg-surface-subtle"
				>
					{ORDER.filter((status) => counts[status] > 0).map(
						(status) => (
							<span
								key={status}
								className={cn(
									"h-full",
									STATUS_BADGE_CLASSES[status],
								)}
								style={{
									width: `${(counts[status] / counts.total) * 100}%`,
								}}
							/>
						),
					)}
				</div>
			)}
			<ul className="flex flex-col gap-2 text-sm">
				{ORDER.map((status) => (
					<li key={status} className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className={cn(
								"size-2.5 rounded-full border border-border-default",
								STATUS_BADGE_CLASSES[status],
							)}
						/>
						<span className="flex-1">
							{/* A non-empty status opens the tab filtered to it. */}
							{counts[status] > 0 ? (
								<Link
									href={eventApplicantsHref(eventId, {
										status,
									})}
									className="underline-offset-2 hover:text-info-fg hover:underline"
								>
									{STATUS_LABELS[status]}
								</Link>
							) : (
								STATUS_LABELS[status]
							)}
						</span>
						<span className="font-mono">
							{formatCount(counts[status])}
						</span>
					</li>
				))}
			</ul>
			<Link
				href={eventApplicantsHref(eventId)}
				className="text-sm text-info-fg underline underline-offset-2 hover:text-ink"
			>
				Jelentkezők megtekintése
			</Link>
		</DetailCard>
	);
}
