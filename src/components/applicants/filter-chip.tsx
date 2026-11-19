"use client";

import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Szűrő-chip: lenyíló panellel; aktív állapotban mutatja az értékét, és
 * külön gombbal egyenként törölhető.
 */
export function FilterChip({
	label,
	value,
	onClear,
	open,
	onOpenChange,
	children,
}: {
	label: string;
	/** Az aktív szűrő megjelenített értéke; `undefined`, ha nincs szűrés. */
	value?: string;
	onClear: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: ReactNode;
}) {
	const active = value !== undefined;

	return (
		<div
			className={cn(
				"flex h-8 items-center rounded-full border text-xs",
				active
					? "border-ink bg-sky-50 text-text-primary"
					: "border-border-strong bg-white text-text-primary",
			)}
		>
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger className="flex h-full items-center gap-1 rounded-full pr-2 pl-3 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none">
					<span className="font-medium">{label}</span>
					{active && (
						<span className="max-w-40 truncate">: {value}</span>
					)}
					<ChevronDown aria-hidden="true" className="size-3.5" />
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-3">
					{children}
				</PopoverContent>
			</Popover>
			{active && (
				<button
					type="button"
					aria-label={`${label} szűrő törlése`}
					onClick={onClear}
					className="mr-1 flex size-6 items-center justify-center rounded-full hover:bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
				>
					<X aria-hidden="true" className="size-3.5" />
				</button>
			)}
		</div>
	);
}

/** Kétállású (igen/nem) szűrő tartalma a chip paneljén. */
export function BooleanOptions({
	value,
	trueLabel,
	falseLabel,
	onChange,
}: {
	value: boolean | undefined;
	trueLabel: string;
	falseLabel: string;
	onChange: (value: boolean | undefined) => void;
}) {
	const options: [string, boolean | undefined][] = [
		["Mindegy", undefined],
		[trueLabel, true],
		[falseLabel, false],
	];
	return (
		<div role="radiogroup" className="flex flex-col gap-1">
			{options.map(([label, optionValue]) => (
				<button
					key={label}
					type="button"
					role="radio"
					aria-checked={value === optionValue}
					onClick={() => onChange(optionValue)}
					className={cn(
						"rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-subtle",
						value === optionValue && "bg-sky-50 font-medium",
					)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
