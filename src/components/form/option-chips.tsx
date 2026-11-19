"use client";

import { cn } from "@/lib/utils";

/** Fix lehetőségekből többet is választható, kapcsolható chipek. */
export function OptionChips<T extends string>({
	id,
	label,
	options,
	value,
	onChange,
	...aria
}: {
	id: string;
	label: string;
	options: readonly T[];
	value: readonly T[];
	onChange: (value: T[]) => void;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}) {
	function toggle(option: T) {
		onChange(
			value.includes(option)
				? value.filter((v) => v !== option)
				: [...value, option],
		);
	}

	return (
		<div
			id={id}
			role="group"
			aria-label={label}
			className="flex flex-wrap gap-2"
			{...aria}
		>
			{options.map((option) => {
				const selected = value.includes(option);
				return (
					<button
						key={option}
						type="button"
						aria-pressed={selected}
						onClick={() => toggle(option)}
						className={cn(
							"h-8 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-sky/70 focus-visible:outline-none",
							selected
								? "border-ink bg-lavender/60"
								: "border-border-strong bg-white hover:bg-sky-50",
						)}
					>
						{option}
					</button>
				);
			})}
		</div>
	);
}
