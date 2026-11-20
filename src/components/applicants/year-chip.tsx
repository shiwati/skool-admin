"use client";

import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-chip";

/** „Program éve” szűrő: a program kezdési évére szűr. */
export function YearChip({
	year,
	years,
	onChange,
}: {
	year?: number;
	/** A választható évek (lásd `programYears`). */
	years: number[];
	onChange: (year: number | undefined) => void;
}) {
	// Az URL-ből jövő, listán kívüli év se tűnjön el a választóból.
	const shown =
		year === undefined || years.includes(year)
			? years
			: [...years, year].sort((a, b) => b - a);
	const options: [string, number | undefined][] = [
		["Bármikor", undefined],
		...shown.map((y): [string, number] => [String(y), y]),
	];
	return (
		<FilterChip
			label="Program éve"
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
