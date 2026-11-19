"use client";

import {
	SearchField,
	TextChip,
} from "@/components/applicants/applicants-toolbar";
import { FilterChip } from "@/components/applicants/filter-chip";
import { Button } from "@/components/ui/button";
import {
	hasActiveEventFilters,
	type EventListFilters,
} from "@/lib/events/list-params";
import type { EventTag } from "@/lib/events/tags";
import { cn } from "@/lib/utils";
import { TagFilter } from "./tag-filter";

/** Választható évek: a következő évtől visszafelé öt évig. */
export function yearOptions(now = new Date()): number[] {
	const current = now.getFullYear();
	return Array.from({ length: 7 }, (_, i) => current + 1 - i);
}

export function EventsToolbar({
	filters,
	onChange,
	onClearAll,
}: {
	filters: EventListFilters;
	onChange: (patch: Partial<EventListFilters>) => void;
	onClearAll: () => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SearchField
				value={filters.q ?? ""}
				onSearch={(q) => onChange({ q })}
				label="Keresés a programok között"
				placeholder="Program neve…"
			/>
			<TagFilter
				selected={filters.tags}
				onChange={(tags) => onChange({ tags: tags as EventTag[] })}
			/>
			<TextChip
				label="Helyszín / partner"
				value={filters.place}
				placeholder="pl. Budapest"
				onChange={(place) => onChange({ place })}
			/>
			<YearChip
				year={filters.year}
				onChange={(year) => onChange({ year })}
			/>
			<TextChip
				label="Oktató"
				value={filters.instructor}
				placeholder="pl. Kovács Béla"
				onChange={(instructor) => onChange({ instructor })}
			/>
			{hasActiveEventFilters(filters) && (
				<Button variant="ghost" size="sm" onClick={onClearAll}>
					Szűrők törlése
				</Button>
			)}
		</div>
	);
}

function YearChip({
	year,
	onChange,
}: {
	year?: number;
	onChange: (year: number | undefined) => void;
}) {
	const options: [string, number | undefined][] = [
		["Bármikor", undefined],
		...yearOptions().map((y): [string, number] => [String(y), y]),
	];
	return (
		<FilterChip
			label="Időszak"
			value={year === undefined ? undefined : String(year)}
			onClear={() => onChange(undefined)}
		>
			<div
				role="radiogroup"
				aria-label="Év"
				className="flex flex-col gap-1"
			>
				{options.map(([label, value]) => (
					<button
						key={label}
						type="button"
						role="radio"
						aria-checked={year === value}
						onClick={() => onChange(value)}
						className={cn(
							"rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-subtle",
							year === value && "bg-sky-50 font-medium",
						)}
					>
						{label}
					</button>
				))}
			</div>
		</FilterChip>
	);
}
