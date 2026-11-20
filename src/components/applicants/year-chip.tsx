"use client";

import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-chip";

/** Választható évek: a következő évtől visszafelé öt évig. */
export function yearOptions(now = new Date()): number[] {
	const current = now.getFullYear();
	return Array.from({ length: 7 }, (_, i) => current + 1 - i);
}

/** „Program éve” szűrő: a program kezdési évére szűr. */
export function YearChip({
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
