"use client";

import { Plus, X } from "lucide-react";
import {
	useCallback,
	useId,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { tagClass } from "@/lib/events/colors";
import { normalizeTag, searchKey, tagError } from "@/lib/events/tags";
import { cn } from "@/lib/utils";

type TagOption = { name: string; count: number };

type Options =
	| { status: "idle" | "loading" | "error" }
	| { status: "success"; items: TagOption[] };

type Item =
	| { kind: "existing"; name: string; count: number }
	| { kind: "create"; name: string };

/**
 * Programcímkék mezője: a programokon már használt címkéket ajánlja fel
 * (legtöbbet használt elöl), és az utolsó sorban új címkét is felvehet
 * („+ Új címke: „…””). Ékezet- és kisbetű-független egyezésnél a meglévő
 * címkét ajánlja, nem újat. Billentyűzet: nyilak, Enter, Escape, Backspace
 * az üres mezőben az utolsó címkét törli. Vezérelt komponens.
 */
export function TagCombobox({
	id,
	value,
	onChange,
	placeholder = "Címke keresése vagy új címke…",
	...aria
}: {
	id: string;
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}) {
	const [options, setOptions] = useState<Options>({ status: "idle" });
	const [text, setText] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const loading = useRef(false);
	const listId = useId();
	const optionId = (index: number) => `${listId}-option-${index}`;

	const load = useCallback(async () => {
		if (loading.current) return;
		loading.current = true;
		setOptions({ status: "loading" });
		try {
			const { items } = await apiFetch<{ items: TagOption[] }>(
				"/api/events/tags",
			);
			setOptions(
				Array.isArray(items)
					? { status: "success", items }
					: { status: "error" },
			);
		} catch (error) {
			// 401: apiFetch is already redirecting to the login page.
			// Otherwise new tags can still be added, just without suggestions.
			if (!(error instanceof ApiError && error.status === 401)) {
				setOptions({ status: "error" });
			}
		} finally {
			loading.current = false;
		}
	}, []);

	const normalized = normalizeTag(text);
	const invalid = normalized ? tagError(normalized) : null;

	const items = useMemo<Item[]>(() => {
		const key = searchKey(normalized);
		const known = options.status === "success" ? options.items : [];
		const selectedKeys = new Set(value.map(searchKey));
		const candidates = known.filter(
			(option) =>
				!selectedKeys.has(searchKey(option.name)) &&
				(!key || searchKey(option.name).includes(key)),
		);
		// An exact (case- and accent-insensitive) match goes first.
		const exact = candidates.findIndex((o) => searchKey(o.name) === key);
		if (exact > 0) candidates.unshift(...candidates.splice(exact, 1));

		const result: Item[] = candidates.map((o) => ({
			kind: "existing",
			...o,
		}));
		const duplicate =
			selectedKeys.has(key) ||
			known.some((option) => searchKey(option.name) === key);
		if (normalized && !invalid && !duplicate) {
			result.push({ kind: "create", name: normalized });
		}
		return result;
	}, [normalized, invalid, options, value]);

	const showList = open && (items.length > 0 || Boolean(invalid));
	const activeIndex = Math.min(active, items.length - 1);

	function add(tag: string) {
		if (!value.includes(tag)) onChange([...value, tag]);
		setText("");
		setActive(0);
	}

	function remove(tag: string) {
		onChange(value.filter((v) => v !== tag));
	}

	function openList() {
		setOpen(true);
		if (options.status === "idle") void load();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		const last = items.length - 1;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				openList();
				if (last >= 0) setActive((i) => (i >= last ? 0 : i + 1));
				break;
			case "ArrowUp":
				event.preventDefault();
				if (last >= 0) setActive((i) => (i <= 0 ? last : i - 1));
				break;
			case "Enter":
				// Never submit the form from this field.
				event.preventDefault();
				if (showList && last >= 0) add(items[activeIndex].name);
				break;
			case "Escape":
				if (open) {
					event.preventDefault();
					setOpen(false);
				}
				break;
			case "Backspace":
				if (text === "" && value.length > 0) remove(value.at(-1)!);
				break;
		}
	}

	return (
		<div className="relative">
			<div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-white px-2 py-1.5 transition-[color,box-shadow] focus-within:border-ink focus-within:ring-[3px] focus-within:ring-sky/70 has-[[aria-invalid=true]]:border-error-fg">
				{value.map((tag) => (
					<span
						key={tag}
						className={cn(
							"inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium",
							tagClass(tag),
						)}
					>
						{tag}
						<button
							type="button"
							aria-label={`Címke eltávolítása: ${tag}`}
							onClick={() => remove(tag)}
							className="grid size-4 place-items-center rounded-full hover:bg-ink/10"
						>
							<X aria-hidden="true" className="size-3" />
						</button>
					</span>
				))}
				<input
					id={id}
					type="text"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={showList}
					aria-controls={listId}
					aria-activedescendant={
						showList && items.length > 0
							? optionId(activeIndex)
							: undefined
					}
					autoComplete="off"
					placeholder={value.length === 0 ? placeholder : undefined}
					value={text}
					onChange={(event) => {
						setText(event.target.value);
						setActive(0);
						openList();
					}}
					onFocus={openList}
					onBlur={() => setOpen(false)}
					onKeyDown={handleKeyDown}
					className="min-w-32 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
					{...aria}
				/>
			</div>
			<ul
				id={listId}
				role="listbox"
				aria-label="Címkejavaslatok"
				hidden={!showList}
				className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border-default bg-white p-1 shadow-overlay"
			>
				{items.map((item, index) => (
					<li
						key={`${item.kind}-${item.name}`}
						id={optionId(index)}
						role="option"
						aria-selected={index === activeIndex}
						// Keep focus in the input while clicking.
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => add(item.name)}
						onMouseEnter={() => setActive(index)}
						className={cn(
							"flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
							index === activeIndex && "bg-surface-subtle",
							item.kind === "create" && "font-medium",
							// Separate it from the suggestions, if there are any.
							item.kind === "create" &&
								index > 0 &&
								"border-t border-border-default",
						)}
					>
						{item.kind === "existing" ? (
							<>
								<span className="flex-1">{item.name}</span>
								<span className="text-xs text-text-tertiary">
									{item.count} program
								</span>
							</>
						) : (
							<>
								<Plus aria-hidden="true" className="size-3.5" />
								Új címke: „{item.name}”
							</>
						)}
					</li>
				))}
				{invalid && (
					<li
						role="presentation"
						className="px-2 py-1.5 text-xs text-error-fg"
					>
						{invalid}
					</li>
				)}
			</ul>
		</div>
	);
}
