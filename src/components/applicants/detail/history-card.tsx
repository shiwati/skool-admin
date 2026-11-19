import {
	historyFieldLabel,
	historyValue,
} from "@/lib/applicants/detail-labels";
import type { ApplicantHistoryEntry } from "@/lib/applicants/detail";
import { formatDateTime } from "@/lib/applicants/format";
import { DetailCard } from "./detail-card";

export function HistoryCard({ entries }: { entries: ApplicantHistoryEntry[] }) {
	return (
		<DetailCard title="Változástörténet">
			{entries.length === 0 ? (
				<p className="text-sm text-text-secondary">
					Még nincs rögzített változás
				</p>
			) : (
				<ol className="flex flex-col gap-4">
					{entries.map((entry) => {
						const oldValue = historyValue(
							entry.field,
							entry.oldValue,
						);
						const newValue = historyValue(
							entry.field,
							entry.newValue,
						);
						const field = historyFieldLabel(entry.field);
						return (
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
										módosította: {field}
										{entry.programName &&
											` (${entry.programName})`}
									</div>
									{(oldValue !== null ||
										newValue !== null) && (
										<div className="break-words">
											<del className="text-text-tertiary">
												{oldValue ?? "—"}
											</del>{" "}
											→{" "}
											<ins className="no-underline">
												{newValue ?? "—"}
											</ins>
										</div>
									)}
									<time
										dateTime={entry.createdAt.toISOString()}
										className="font-mono text-xs text-text-tertiary"
									>
										{formatDateTime(entry.createdAt)}
									</time>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</DetailCard>
	);
}
