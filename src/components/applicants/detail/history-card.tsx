import Link from "next/link";
import {
	HistoryChangeDiff,
	HistoryChangeSummary,
} from "@/components/history/history-change";
import type { ApplicantHistoryEntry } from "@/lib/applicants/detail";
import { formatDateTime } from "@/lib/applicants/format";
import { historyHref } from "@/lib/history/href";
import { DetailCard } from "./detail-card";

/** Az utolsó néhány változás, link a teljes naplóra (`/history/[id]`). */
export function HistoryCard({
	applicantId,
	entries,
}: {
	applicantId: string;
	entries: ApplicantHistoryEntry[];
}) {
	return (
		<DetailCard
			title="Legutóbbi változások"
			aside={
				<Link
					href={historyHref(applicantId)}
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
								<HistoryChangeSummary
									kind="applicant"
									entry={entry}
								/>
								<HistoryChangeDiff
									kind="applicant"
									entry={entry}
								/>
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
