"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api/client";
import { formatCount } from "@/lib/applicants/format";

type SyncResult = {
	created: number;
	existing: number;
	duplicates: number;
	errors: unknown[];
};

const SYNC_FAILED = "A szinkronizálás nem sikerült. Próbáld újra.";
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

/** A szerver magyar hibaüzenetét mutatjuk; ismeretlen válasznál általános szöveget. */
function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		const message = (error.body as { error?: unknown } | undefined)?.error;
		if (typeof message === "string" && error.status !== 500) return message;
	}
	return SYNC_FAILED;
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
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function sync() {
		if (pending) return;
		setPending(true);
		try {
			const result = await apiFetch<SyncResult>(
				`/api/events/${encodeURIComponent(eventId)}/sync`,
				{ method: "POST" },
			);
			toast.success(`Szinkronizálva: ${syncMessage(result)}.`);
			onSynced?.();
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(errorMessage(error));
		} finally {
			setPending(false);
		}
	}

	return (
		<Button
			variant="surface"
			className={className}
			disabled={pending}
			aria-busy={pending || undefined}
			title={SYNC_HINT}
			onClick={() => void sync()}
		>
			<RefreshCw
				aria-hidden="true"
				className={pending ? "animate-spin" : undefined}
			/>
			Szinkronizálás most
		</Button>
	);
}
