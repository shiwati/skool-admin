"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, apiErrorMessage, apiFetch } from "@/lib/api/client";
import { formatCount } from "@/lib/applicants/format";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";

type RoleResult = { created: number; existing: number; errors: unknown[] };
type SyncResult = Partial<Record<FeedbackRoleKey, RoleResult>>;

const SYNC_FAILED = "A szinkronizálás nem sikerült. Próbáld újra.";

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
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function sync() {
		if (pending) return;
		setPending(true);
		try {
			const result = await apiFetch<SyncResult>(
				`/api/events/${encodeURIComponent(eventId)}/feedback/sync`,
				{ method: "POST" },
			);
			toast.success(`Szinkronizálva – ${syncMessage(result)}.`);
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(apiErrorMessage(error, SYNC_FAILED));
		} finally {
			setPending(false);
		}
	}

	return (
		<Button
			variant="surface"
			disabled={pending}
			aria-busy={pending || undefined}
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
