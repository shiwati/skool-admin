"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { eventEditHref } from "@/lib/events/links";
import { SheetSyncButton, SYNC_HINT } from "./sheet-sync-button";

export { SYNC_HINT };

function isWebUrl(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

export function SheetSourceCard({
	eventId,
	applicationSheetUrl,
}: {
	eventId: string;
	applicationSheetUrl: string | null;
}) {
	return (
		<DetailCard
			title="Jelentkezők forrása"
			subtitle={applicationSheetUrl ? SYNC_HINT : undefined}
		>
			{applicationSheetUrl ? (
				<>
					<p className="flex min-w-0 items-center gap-1.5 text-sm">
						{isWebUrl(applicationSheetUrl) ? (
							<a
								href={applicationSheetUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex min-w-0 items-center gap-1.5 text-info-fg underline underline-offset-2 hover:text-ink"
							>
								<span className="truncate">
									Google Sheet megnyitása
								</span>
								<ExternalLink
									aria-hidden="true"
									className="size-3.5 shrink-0"
								/>
								<span className="sr-only">(új lapon)</span>
							</a>
						) : (
							<span className="truncate">
								{applicationSheetUrl}
							</span>
						)}
					</p>
					<SheetSyncButton eventId={eventId} className="self-start" />
				</>
			) : (
				<p className="text-sm text-text-secondary">
					Ehhez a programhoz még nincs jelentkezői sheet megadva.{" "}
					<Link
						href={eventEditHref(eventId)}
						className="text-info-fg underline underline-offset-2 hover:text-ink"
					>
						Megadás a szerkesztésnél
					</Link>
				</p>
			)}
		</DetailCard>
	);
}
