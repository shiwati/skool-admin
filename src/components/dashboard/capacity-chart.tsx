"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import { type CapacityRow } from "@/lib/dashboard/compute";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./kpi-card";
import { Segmented } from "./segmented";
import { StatBadge, ratioTone } from "./stat-badge";
import { formatCount, formatRatio } from "@/lib/format";

const STATUS_ORDER: ApplicationStatus[] = [
	"APPLIED",
	"ACCEPTED",
	"WAITLISTED",
	"ATTENDED",
	"REJECTED",
];

type Filter = "upcoming" | "past" | "all";

const FILTERS = [
	{ value: "all", label: "Mind" },
	{ value: "past", label: "Múltbeli" },
	{ value: "upcoming", label: "Jövőbeli" },
] as const satisfies readonly { value: Filter; label: string }[];

const EMPTY_TEXT: Record<Filter, string> = {
	upcoming:
		"A kiválasztott időszakban nincs jövőbeli vagy most zajló program.",
	past: "A kiválasztott időszakban nincs már lezajlott program.",
	all: "Nincs megjeleníthető program.",
};

export function CapacityChart({ rows }: { rows: CapacityRow[] }) {
	const [selected, setFilter] = useState<Filter>("all");
	// Ha minden program ugyanabban az állapotban van (pl. régi évben mind
	// lezárult), a szűrők a Mind listát ismételnék: ilyenkor nincs fülsor.
	const mixed =
		rows.some((r) => r.state === "upcoming") &&
		rows.some((r) => r.state === "past");
	const filter = mixed ? selected : "all";
	const visible =
		filter === "all" ? rows : rows.filter((r) => r.state === filter);
	const pct = (value: number, row: CapacityRow) =>
		`${(value / Math.max(1, row.capacity, row.applications)) * 100}%`;

	return (
		<Card className="flex h-full min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Kapacitás vs. jelentkezők programonként"
				subtitle="A kiválasztott időszakban induló programok · a fekete jel a maximális létszám"
				actions={
					mixed && (
						<Segmented
							label="Programok szűrése"
							options={FILTERS}
							value={filter}
							onChange={setFilter}
						/>
					)
				}
			/>

			{visible.length === 0 ? (
				<p className="py-8 text-center text-sm text-text-secondary">
					{EMPTY_TEXT[filter]}
				</p>
			) : (
				<ul className="flex min-h-52 flex-1 flex-col gap-3">
					{visible.map((row) => (
						<li
							key={row.id}
							className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
						>
							<span
								className="w-full min-w-0 truncate text-sm md:w-56"
								title={row.name}
							>
								{row.name}
							</span>
							<span
								aria-hidden="true"
								className="relative h-5 min-w-30 flex-1 rounded-md bg-surface-subtle"
							>
								<span
									className="absolute inset-y-0 left-0 flex overflow-hidden rounded-md"
									style={{
										width: pct(row.applications, row),
									}}
								>
									{STATUS_ORDER.filter(
										(status) =>
											(row.byStatus[status] ?? 0) > 0,
									).map((status) => (
										<span
											key={status}
											className={cn(
												"h-full border-r border-white last:border-r-0",
												STATUS_BADGE_CLASSES[status],
											)}
											style={{
												flex: `${row.byStatus[status]} 0 0`,
											}}
										/>
									))}
								</span>
								{row.capacity > 0 && (
									<span
										className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-sm bg-ink"
										style={{ left: pct(row.capacity, row) }}
									/>
								)}
							</span>
							<span className="flex w-40 items-center justify-end gap-2">
								<span className="font-mono text-xs text-text-secondary">
									{formatCount(row.applications)} /{" "}
									{row.capacity > 0
										? `${formatCount(row.capacity)} fő`
										: "nincs kapacitás"}
								</span>
								{row.ratio !== null && (
									<StatBadge tone={ratioTone(row.ratio)}>
										{formatRatio(row.ratio)}
									</StatBadge>
								)}
							</span>
						</li>
					))}
				</ul>
			)}

			<div className="mt-auto flex flex-col gap-2">
				<p className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
					Jelmagyarázat
				</p>
				<div className="flex flex-wrap gap-4 text-xs text-text-secondary">
					{STATUS_ORDER.map((status) => (
						<span
							key={status}
							className="flex items-center gap-1.5"
						>
							<span
								aria-hidden="true"
								className={cn(
									"size-3 rounded-xs border border-border-default",
									STATUS_BADGE_CLASSES[status],
								)}
							/>
							{STATUS_LABELS[status]}
						</span>
					))}
					<span className="flex items-center gap-1.5">
						<span
							aria-hidden="true"
							className="h-3 w-[3px] rounded-xs bg-ink"
						/>
						Max. létszám
					</span>
				</div>
			</div>
		</Card>
	);
}
