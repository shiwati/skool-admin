"use client";

import { SyncButton } from "@/components/shared/sync-button";
import { formatCount } from "@/lib/format";

type SyncResult = {
	created: number;
	existing: number;
	duplicates: number;
	errors: unknown[];
};

export const SYNC_HINT =
	"A szinkronizálás beolvassa a Google Sheetet, és felveszi a legutóbbi szinkronizálás óta beérkezett új jelentkezéseket. A sheetben utólag módosított sorok nem frissülnek.";

function syncMessage(result: SyncResult): string {
	const parts = [
		`${formatCount(result.created)} új jelentkezés`,
		`${formatCount(result.existing)} már meglévő`,
	];
	if (result.duplicates > 0) {
		parts.push(`${formatCount(result.duplicates)} lehetséges duplikátum`);
	}
	if (result.errors.length > 0) {
		parts.push(`${formatCount(result.errors.length)} hibás sor`);
	}
	return parts.join(", ");
}

/**
 * A program jelentkezői sheetjének szinkronizálása (`POST /api/events/[id]/sync`).
 * Siker után frissíti a szerveroldali adatokat, és meghívja az `onSynced`-et.
 */
export function SheetSyncButton({
	eventId,
	className,
	onSynced,
}: {
	eventId: string;
	className?: string;
	onSynced?: () => void;
}) {
	return (
		<SyncButton<SyncResult>
			url={`/api/events/${encodeURIComponent(eventId)}/sync`}
			successMessage={(result) =>
				`Szinkronizálva: ${syncMessage(result)}.`
			}
			onSynced={onSynced}
			className={className}
			title={SYNC_HINT}
		/>
	);
}
