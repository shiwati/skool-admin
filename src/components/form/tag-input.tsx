"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Szabad szavas címkék: Enter vagy vessző felvesz, Backspace az üres mezőben
 * az utolsót törli, a mezőből kilépve a félbehagyott szöveg is felkerül.
 */
export function TagInput({
	id,
	value,
	onChange,
	placeholder,
	removeLabel,
	className,
	...aria
}: {
	id: string;
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	/** Az eltávolító gomb címkéje a megadott elemmel, képernyőolvasóhoz. */
	removeLabel: (item: string) => string;
	className?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}) {
	const [draft, setDraft] = useState("");

	function commit() {
		const item = draft.trim();
		setDraft("");
		if (!item || value.includes(item)) return;
		onChange([...value, item]);
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			commit();
		} else if (event.key === "Backspace" && draft === "" && value.length) {
			onChange(value.slice(0, -1));
		}
	}

	return (
		<div
			className={cn(
				"flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-white px-2 py-1.5 transition-[color,box-shadow] focus-within:border-ink focus-within:ring-[3px] focus-within:ring-sky/70 has-[[aria-invalid=true]]:border-error-fg",
				className,
			)}
		>
			{value.map((item) => (
				<span
					key={item}
					className="inline-flex items-center gap-1 rounded-full bg-lavender/60 py-0.5 pr-1 pl-2.5 text-xs font-medium"
				>
					{item}
					<button
						type="button"
						aria-label={removeLabel(item)}
						onClick={() =>
							onChange(value.filter((v) => v !== item))
						}
						className="grid size-4 place-items-center rounded-full hover:bg-ink/10"
					>
						<X aria-hidden="true" className="size-3" />
					</button>
				</span>
			))}
			<input
				id={id}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={onKeyDown}
				onBlur={commit}
				placeholder={placeholder}
				className="min-w-32 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
				{...aria}
			/>
		</div>
	);
}
