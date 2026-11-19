"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api/client";
import { formatCount } from "@/lib/applicants/format";
import { eventEditHref } from "@/lib/events/links";

type SyncResult = {
	created: number;
	existing: number;
	duplicates: number;
	errors: unknown[];
};

const SYNC_FAILED = "A szinkronizálás nem sikerült. Próbáld újra.";

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

function isWebUrl(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

export function SheetSourceCard({
	eventId,
	sheetUrl,
}: {
	eventId: string;
	sheetUrl: string | null;
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
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(errorMessage(error));
		} finally {
			setPending(false);
		}
	}

	return (
		<DetailCard title="Jelentkezők forrása">
			{sheetUrl ? (
				<>
					<p className="flex min-w-0 items-center gap-1.5 text-sm">
						{isWebUrl(sheetUrl) ? (
							<a
								href={sheetUrl}
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
							<span className="truncate">{sheetUrl}</span>
						)}
					</p>
					<Button
						variant="surface"
						className="self-start"
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
