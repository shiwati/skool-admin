"use client";

import { cn } from "@/lib/utils";

/** Egyválasztós kapcsolósor (design „seg”): gombok `aria-pressed` állapottal. */
export function Segmented<T extends string | number>({
	label,
	options,
	value,
	onChange,
	className,
}: {
	label: string;
	options: readonly { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
}) {
	return (
		<div
			role="group"
			aria-label={label}
			className={cn(
				"inline-flex w-fit gap-0.5 rounded-full bg-surface-subtle p-0.5",
				className,
			)}
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={selected}
						onClick={() => onChange(option.value)}
						className={cn(
							"h-8 rounded-full px-3 text-xs font-medium transition-colors",
							selected
								? "bg-white text-text-primary shadow-card"
								: "text-text-secondary hover:text-text-primary",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
