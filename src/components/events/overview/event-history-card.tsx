import Link from "next/link";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { EMPTY, formatDateTime } from "@/lib/applicants/format";
import {
	eventHistoryFieldLabel,
	eventHistoryValue,
} from "@/lib/events/history-labels";
import type { EventHistoryEntry } from "@/lib/events/overview";
import { historyHref } from "@/lib/history/href";

/** Az utolsó néhány változás, link a teljes naplóra (`/history/[id]`). */
export function EventHistoryCard({
	eventId,
	entries,
}: {
	eventId: string;
	entries: EventHistoryEntry[];
}) {
	return (
		<DetailCard
			title="Legutóbbi változások"
			aside={
				<Link
					href={historyHref(eventId)}
					className="text-sm font-medium underline-offset-2 hover:underline"
				>
					Teljes napló
				</Link>
			}
		>
			{entries.length === 0 ? (
				<p className="text-sm text-text-secondary">
					Még nincs rögzített változás
				</p>
			) : (
				<ol className="flex flex-col gap-4">
					{entries.map((entry) => (
						<li key={entry.id} className="flex gap-3">
							<span
								aria-hidden="true"
								className="mt-1.5 size-2 shrink-0 rounded-full bg-border-strong"
							/>
							<div className="flex min-w-0 flex-col gap-1.5 text-sm">
								<div>
									<span className="font-medium">
										{entry.actor ?? "Rendszer"}
									</span>{" "}
									módosította:{" "}
									{eventHistoryFieldLabel(entry.field)}
								</div>
								<div className="break-words">
									<del className="text-text-tertiary">
										{eventHistoryValue(
											entry.field,
											entry.oldValue,
										) ?? EMPTY}
									</del>{" "}
									→{" "}
									<ins className="no-underline">
										{eventHistoryValue(
											entry.field,
											entry.newValue,
										) ?? EMPTY}
									</ins>
								</div>
								<time
									dateTime={entry.createdAt.toISOString()}
									className="font-mono text-xs text-text-tertiary"
								>
									{formatDateTime(entry.createdAt)}
								</time>
							</div>
						</li>
					))}
				</ol>
			)}
		</DetailCard>
	);
}
