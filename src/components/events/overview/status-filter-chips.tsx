"use client";

import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import type { StatusCounts } from "@/lib/events/list";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

const ORDER: ApplicationStatus[] = [
	"APPLIED",
	"ACCEPTED",
	"WAITLISTED",
	"ATTENDED",
	"REJECTED",
	"CANCELLED",
];

const chip =
	"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm";

export function StatusFilterChips({
	counts,
	value,
	onChange,
}: {
	counts: StatusCounts;
	value: ApplicationStatus | null;
	onChange: (status: ApplicationStatus | null) => void;
}) {
	return (
		<div
			role="group"
			aria-label="Szűrés státusz szerint"
			className="flex flex-wrap gap-2"
		>
			<button
				type="button"
				aria-pressed={value === null}
				onClick={() => onChange(null)}
				className={cn(
					chip,
					value === null
						? "border-ink bg-ink text-white"
						: "border-border-default bg-white hover:bg-surface-subtle",
				)}
			>
				Mind
				<span className="font-mono">{formatCount(counts.total)}</span>
			</button>
			{ORDER.map((status) => (
				<button
					key={status}
					type="button"
					aria-pressed={value === status}
					onClick={() => onChange(value === status ? null : status)}
					className={cn(
						chip,
						value === status
							? "border-ink bg-white ring-1 ring-ink"
							: "border-border-default bg-white hover:bg-surface-subtle",
					)}
				>
					<span
						aria-hidden="true"
						className={cn(
							"size-2.5 rounded-full border border-border-default",
							STATUS_BADGE_CLASSES[status],
						)}
					/>
					{STATUS_LABELS[status]}
					<span className="font-mono">
						{formatCount(counts[status])}
					</span>
				</button>
			))}
		</div>
	);
}
