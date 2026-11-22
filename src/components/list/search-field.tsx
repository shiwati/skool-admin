"use client";

import { Search } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

/** Ennyi ideig vár gépelés után, mielőtt keresne. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * A listák keresőmezője: gépelés után késleltetve keres, és a saját,
 * URL-ből visszaérkező értéke nem írja felül a közben tovább gépelt szöveget.
 */
export function SearchField({
	value,
	onSearch,
	label = "Keresés a listában",
	placeholder = "Keresés a listában…",
}: {
	value: string;
	onSearch: (q: string | undefined) => void;
	label?: string;
	placeholder?: string;
}) {
	const [draft, setDraft] = useState(value);
	// The last query this field sent, so its own echo from the URL does not
	// overwrite what the user kept typing in the meantime.
	const [sent, setSent] = useState<string | null>(null);
	const [seenValue, setSeenValue] = useState(value);

	// External change (e.g. "Szűrők törlése"): adopt it during render.
	if (value !== seenValue) {
		setSeenValue(value);
		if (value !== sent) setDraft(value);
	}

	const emit = useEffectEvent((q: string) => {
		if (q === value) return;
		setSent(q);
		onSearch(q || undefined);
	});

	useEffect(() => {
		const timer = setTimeout(() => emit(draft.trim()), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draft]);

	return (
		<label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border-strong bg-white px-3 text-text-tertiary md:h-8 md:w-64 md:flex-none">
			<Search aria-hidden="true" className="size-4" />
			<input
				type="search"
				aria-label={label}
				placeholder={placeholder}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				className="min-w-0 flex-1 bg-transparent text-sm text-text-primary md:text-xs"
			/>
		</label>
	);
}
