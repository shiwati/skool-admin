"use client";

import { Check } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { FilterChip } from "@/components/applicants/filter-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api/client";
import { searchKey } from "@/lib/events/tags";
import { cn } from "@/lib/utils";

type Options =
	| { status: "idle" | "loading" }
	| { status: "success"; items: string[] }
	| { status: "error" };

/**
 * Címkeszűrő: többválasztós lista a programokon használt címkékből,
 * gépelés közbeni (böngészőoldali) szűréssel. Új címkét itt nem lehet
 * felvenni, csak a program űrlapján. Vezérelt komponens; az URL-állapot a
 * befoglaló képernyő dolga.
 */
export function TagFilter({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (tags: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<Options>({ status: "idle" });
	const [text, setText] = useState("");
	const [active, setActive] = useState(0);
	const loading = useRef(false);
	const listId = useId();
	const optionId = (index: number) => `${listId}-option-${index}`;

	const load = useCallback(async () => {
		if (loading.current) return;
		loading.current = true;
		setOptions({ status: "loading" });
		try {
			const { items } = await apiFetch<{
				items: { name: string; count: number }[];
			}>("/api/events/tags");
			setOptions({
				status: "success",
				items: items.map((item) => item.name),
			});
		} catch (error) {
			// 401: apiFetch is already redirecting to the login page.
			if (!(error instanceof ApiError && error.status === 401)) {
				setOptions({ status: "error" });
			}
		} finally {
			loading.current = false;
		}
	}, []);

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (next) {
			setText("");
			setActive(0);
			if (options.status === "idle" || options.status === "error") {
				void load();
			}
		}
	}

	const matches = useMemo(() => {
		if (options.status !== "success") return [];
		const key = searchKey(text.trim());
		return key
			? options.items.filter((tag) => searchKey(tag).includes(key))
			: options.items;
	}, [options, text]);

	function toggle(tag: string) {
		onChange(
			selected.includes(tag)
				? selected.filter((t) => t !== tag)
				: [...selected, tag],
		);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (matches.length === 0) return;
		const last = matches.length - 1;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActive((i) => (i >= last ? 0 : i + 1));
				break;
			case "ArrowUp":
				event.preventDefault();
				setActive((i) => (i <= 0 ? last : i - 1));
				break;
			case "Home":
				event.preventDefault();
				setActive(0);
				break;
			case "End":
				event.preventDefault();
				setActive(last);
				break;
			case "Enter":
				event.preventDefault();
				toggle(matches[Math.min(active, last)]);
				break;
		}
	}

	const value =
		selected.length === 0
			? undefined
			: selected.length === 1
				? selected[0]
				: `${selected.length} címke`;
	const activeIndex = Math.min(active, matches.length - 1);
	const showList = options.status === "success";

	return (
		<FilterChip
			label="Címke"
			value={value}
			onClear={() => onChange([])}
			open={open}
			onOpenChange={handleOpenChange}
		>
			<div className="flex flex-col gap-2">
				<input
					type="text"
					role="combobox"
					aria-label="Címke keresése"
					aria-autocomplete="list"
					aria-expanded={showList}
					aria-controls={listId}
					aria-activedescendant={
						showList && matches.length > 0
							? optionId(activeIndex)
							: undefined
					}
					placeholder="Keresés…"
					autoComplete="off"
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setActive(0);
					}}
					onKeyDown={handleKeyDown}
					className="h-8 w-full rounded-md border border-border-strong bg-white px-2 text-sm focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
				/>

				{(options.status === "loading" ||
					options.status === "idle") && (
					<div
						aria-busy="true"
						aria-label="Címkék betöltése"
						className="flex flex-col gap-1"
					>
						<Skeleton className="h-7 w-full" />
						<Skeleton className="h-7 w-full" />
						<Skeleton className="h-7 w-2/3" />
					</div>
				)}

				{options.status === "error" && (
					<div
						role="alert"
						className="flex items-center justify-between gap-2 text-sm"
					>
						<span>A címkék nem tölthetők be.</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => void load()}
						>
							Újra
						</Button>
					</div>
				)}

				{showList && (
					<ul
						id={listId}
						role="listbox"
						aria-label="Címkék"
						aria-multiselectable="true"
						className="flex max-h-72 flex-col gap-0.5 overflow-y-auto"
					>
						{matches.map((tag, index) => {
							const checked = selected.includes(tag);
							return (
								<li
									key={tag}
									id={optionId(index)}
									role="option"
									aria-selected={checked}
									// Keep focus in the input while clicking.
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => toggle(tag)}
									onMouseEnter={() => setActive(index)}
									className={cn(
										"flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
										index === activeIndex &&
											"bg-surface-subtle",
									)}
								>
									<span
										aria-hidden="true"
										className={cn(
											"flex size-4 items-center justify-center rounded-sm border border-border-strong",
											checked &&
												"border-ink bg-ink text-white",
										)}
									>
										{checked && (
											<Check className="size-3" />
										)}
									</span>
									{tag}
								</li>
							);
						})}
						{matches.length === 0 && (
							<li
								role="presentation"
								className="px-2 py-1.5 text-sm text-text-secondary"
							>
								Nincs találat
							</li>
						)}
					</ul>
				)}
			</div>
		</FilterChip>
	);
}
