"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "./filter-chip";

/** Szabad szöveges szűrő chip (pl. település, helyszín): „Alkalmaz” gombbal. */
export function TextChip({
	label,
	value,
	placeholder,
	onChange,
}: {
	label: string;
	value?: string;
	placeholder: string;
	onChange: (value: string | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(value ?? "");

	return (
		<FilterChip
			label={label}
			value={value}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setDraft(value ?? "");
			}}
			onClear={() => onChange(undefined)}
		>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					onChange(draft.trim() || undefined);
					setOpen(false);
				}}
			>
				<label className="flex flex-col gap-1 text-xs font-medium">
					{label}
					<Input
						value={draft}
						placeholder={placeholder}
						onChange={(e) => setDraft(e.target.value)}
					/>
				</label>
				<Button type="submit" size="sm" className="self-end">
					Alkalmaz
				</Button>
			</form>
		</FilterChip>
	);
}
