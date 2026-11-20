"use client";

import Link from "next/link";
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
	hrefFor,
	onChange,
}: {
	tab: EventTab;
	counts: PhaseCounts;
	hrefFor: (tab: EventTab) => string;
	onChange: (tab: EventTab) => void;
}) {
	return (
		<nav
			aria-label="Programok szakasz szerint"
			// Scrolls sideways when the tabs do not fit. The baseline is an inset shadow, not a border, so the tabs need no -mb-px overhang (it caused the vertical scrollbar) and the active underline paints over it in full.
			className="relative -mx-4 overflow-x-auto overflow-y-hidden px-4 shadow-[inset_0_-1px_0_var(--color-border-default)] md:mx-0 md:px-0"
		>
			<ul className="flex gap-1">
				{EVENT_TABS.map((id) => {
					const selected = id === tab;
					return (
						<li key={id} className="shrink-0">
							<Link
								href={hrefFor(id)}
								replace
								scroll={false}
								aria-current={selected ? "page" : undefined}
								onClick={(e) => {
									// Módosítóbillentyűs kattintás (új lap) marad a böngészőé.
									if (
										e.metaKey ||
										e.ctrlKey ||
										e.shiftKey ||
										e.altKey ||
										e.button !== 0
									)
										return;
									e.preventDefault();
									if (!selected) onChange(id);
								}}
								className={cn(
									"flex min-h-11 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none focus-visible:ring-inset",
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
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
