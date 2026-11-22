"use client";

import { X } from "lucide-react";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";

import { STATUS_OPTIONS as STATUSES } from "./status-cell";
import { formatCount } from "@/lib/format";

/** Lebegő sáv: a kijelölt jelentkezések státuszának egyszerre állítása. */
export function BulkStatusBar({
	count,
	pending,
	onSetStatus,
	onClear,
}: {
	count: number;
	pending: boolean;
	onSetStatus: (status: ApplicationStatus) => void;
	onClear: () => void;
}) {
	if (count === 0) return null;

	return (
		<div className="pointer-events-none fixed right-0 bottom-7 left-[var(--shell-left)] z-40 flex justify-center px-4 md:px-6">
			<div
				role="toolbar"
				aria-label="Tömeges műveletek"
				className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-3xl bg-ink py-2 pr-2 pl-[18px] text-white shadow-overlay"
			>
				<span className="mr-1.5 text-sm font-medium" aria-live="polite">
					{formatCount(count)} kijelölve
				</span>
				<span aria-hidden="true" className="h-5 w-px bg-white/25" />
				<span className="text-xs text-white/70">Státusz:</span>
				{STATUSES.map((status) => (
					<button
						key={status}
						type="button"
						disabled={pending}
						onClick={() => onSetStatus(status)}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[13px] whitespace-nowrap hover:bg-white/10 disabled:opacity-50",
						)}
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-2.5 rounded-full",
								STATUS_BADGE_CLASSES[status],
							)}
						/>
						{STATUS_LABELS[status]}
					</button>
				))}
				<button
					type="button"
					aria-label="Kijelölés megszüntetése"
					disabled={pending}
					onClick={onClear}
					className="flex size-8 items-center justify-center rounded-full bg-white/12 hover:bg-white/20"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			</div>
		</div>
	);
}
