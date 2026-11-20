"use client";

import {
	SearchField,
	TextChip,
} from "@/components/applicants/applicants-toolbar";
import { YearChip } from "@/components/applicants/year-chip";
import { Button } from "@/components/ui/button";
import {
	hasActiveEventFilters,
	type EventListFilters,
} from "@/lib/events/list-params";
import type { ReactNode } from "react";
import { TagFilter } from "./tag-filter";

export function EventsToolbar({
	filters,
	onChange,
	onClearAll,
	trailing,
	mobileTrailing,
}: {
	filters: EventListFilters;
	onChange: (patch: Partial<EventListFilters>) => void;
	onClearAll: () => void;
	/** Tablettől: a sor végére igazítva (pl. „Oszlopok”). */
	trailing?: ReactNode;
	/** Mobilon: a keresőmező mellett (pl. az oszlopok ikongombja). */
	mobileTrailing?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SearchField
				value={filters.q ?? ""}
				onSearch={(q) => onChange({ q })}
				label="Keresés a programok között"
				placeholder="Program neve…"
			/>
			{mobileTrailing && (
				<div
					data-testid="events-mobile-trailing"
					className="flex md:hidden"
				>
					{mobileTrailing}
				</div>
			)}
			{/* Mobile (board 05.1 M): the chips form one horizontally scrollable row. */}
			<div
				data-testid="event-filter-chips"
				className="relative -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 pb-1 md:contents"
			>
				<TagFilter
					selected={filters.tags}
					onChange={(tags) => onChange({ tags })}
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
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0"
						onClick={onClearAll}
					>
						Szűrők törlése
					</Button>
				)}
			</div>
			{trailing && (
				<div
					data-testid="events-trailing"
					className="hidden md:ml-auto md:flex"
				>
					{trailing}
				</div>
			)}
		</div>
	);
}
