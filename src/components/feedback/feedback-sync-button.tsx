"use client";

import { SyncButton } from "@/components/shared/sync-button";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";
import { formatCount } from "@/lib/format";

type RoleResult = { created: number; existing: number; errors: unknown[] };
type SyncResult = Partial<Record<FeedbackRoleKey, RoleResult>>;

export function syncMessage(result: SyncResult): string {
	return (Object.keys(ROLE_LABELS) as FeedbackRoleKey[])
		.flatMap((role) => {
			const r = result[role];
			if (!r) return [];
			const parts = [`${formatCount(r.created)} új`];
			if (r.errors.length > 0) {
				parts.push(`${formatCount(r.errors.length)} hibás sor`);
			}
			return [`${ROLE_LABELS[role].toLowerCase()}: ${parts.join(", ")}`];
		})
		.join("; ");
}

/** A program visszajelző sheetjeinek beolvasása (csak az új válaszok). */
export function FeedbackSyncButton({ eventId }: { eventId: string }) {
	return (
		<SyncButton<SyncResult>
			url={`/api/events/${encodeURIComponent(eventId)}/feedback/sync`}
			successMessage={(result) =>
				`Szinkronizálva – ${syncMessage(result)}.`
			}
		/>
	);
}
