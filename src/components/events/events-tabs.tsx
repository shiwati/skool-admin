"use client";

import { useRef } from "react";
import { formatCount } from "@/lib/applicants/format";
import type { PhaseCounts } from "@/lib/events/list";
import { EVENT_TABS, type EventTab } from "@/lib/events/list-params";
import { PHASE_LABELS } from "@/lib/events/phase";
import { cn } from "@/lib/utils";

export const EVENTS_TABLE_ID = "events-table";

/** Életciklus-fülek darabszámmal (a többi szűrő figyelembevételével). */
export function EventsTabs({
	tab,
	counts,
	onChange,
}: {
	tab: EventTab;
	counts: PhaseCounts;
	onChange: (tab: EventTab) => void;
}) {
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	function handleKeyDown(event: React.KeyboardEvent, index: number) {
		const last = EVENT_TABS.length - 1;
		const next =
			event.key === "ArrowRight"
				? index === last
					? 0
					: index + 1
				: event.key === "ArrowLeft"
					? index === 0
						? last
						: index - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? last
							: null;
		if (next === null) return;
		event.preventDefault();
		refs.current[next]?.focus();
		onChange(EVENT_TABS[next]);
	}

	return (
		<div
			role="tablist"
			aria-label="Programok szakasz szerint"
			// Scrolls sideways when the tabs do not fit (tablet and mobile).
			className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-border-default px-4 md:mx-0 md:px-0"
		>
			{EVENT_TABS.map((id, index) => {
				const selected = id === tab;
				return (
					<button
						key={id}
						ref={(el) => {
							refs.current[index] = el;
						}}
						type="button"
						role="tab"
						aria-selected={selected}
						aria-controls={EVENTS_TABLE_ID}
						tabIndex={selected ? 0 : -1}
						onClick={() => !selected && onChange(id)}
						onKeyDown={(e) => handleKeyDown(e, index)}
						className={cn(
							"-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							selected
								? "border-ink text-text-primary"
								: "border-transparent text-text-secondary hover:text-text-primary",
						)}
					>
						{PHASE_LABELS[id]}
						<span
							className={cn(
								"rounded-full px-2 font-mono text-[11px] leading-5",
								selected
									? "bg-ink text-white"
									: "bg-surface-subtle text-text-secondary",
							)}
						>
							{formatCount(counts[id])}
						</span>
					</button>
				);
			})}
		</div>
	);
}
