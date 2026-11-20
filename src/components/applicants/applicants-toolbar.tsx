"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useId,
	useState,
	type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	ageRangeError,
	hasActiveFilters,
	type ListFilters,
} from "@/lib/applicants/list-params";
import type { EventOption } from "@/lib/applicants/types";
import { BooleanOptions, FilterChip } from "./filter-chip";

export const SEARCH_DEBOUNCE_MS = 300;

type Props = {
	filters: ListFilters;
	events: EventOption[];
	onChange: (patch: Partial<ListFilters>) => void;
	onClearAll: () => void;
	/** Jobb oldali elem (oszlopválasztó), tablettől. */
	trailing?: ReactNode;
	/** Mobilon (< md) a „Szűrők” gomb után (kompakt oszlopválasztó). */
	mobileTrailing?: ReactNode;
};

/** Az aktív szűrők száma (a keresés nélkül), a mobil „Szűrők” gombhoz. */
export function activeFilterCount(filters: ListFilters): number {
	return [
		filters.eventIds.length > 0,
		filters.ageFrom !== undefined || filters.ageTo !== undefined,
		!!filters.hometown,
		filters.newsletter !== undefined,
		filters.attended !== undefined,
	].filter(Boolean).length;
}

/**
 * Mobilon (< md) a keresés mellett csak egy „Szűrők” gomb látszik, a chipek
 * párbeszédablakban nyílnak; tablettől a chipek sorban, tördelve.
 */
export function ApplicantsToolbar({
	filters,
	events,
	onChange,
	onClearAll,
	trailing,
	mobileTrailing,
}: Props) {
	const chips = (
		<FilterChips
			filters={filters}
			events={events}
			onChange={onChange}
			onClearAll={onClearAll}
		/>
	);
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SearchField
				value={filters.q ?? ""}
				onSearch={(q) => onChange({ q })}
			/>
			<MobileFiltersDialog count={activeFilterCount(filters)}>
				<div className="flex flex-col items-start gap-2">{chips}</div>
			</MobileFiltersDialog>
			{mobileTrailing && (
				<div data-testid="mobile-trailing" className="flex md:hidden">
					{mobileTrailing}
				</div>
			)}
			<div data-testid="inline-filters" className="hidden md:contents">
				{chips}
				<span className="flex-1" />
				{trailing}
			</div>
		</div>
	);
}

/** Mobil „Szűrők” gomb (aktív szűrők számával) és a szűrők párbeszédablaka. */
export function MobileFiltersDialog({
	count,
	children,
}: {
	count: number;
	children: ReactNode;
}) {
	return (
		<Dialog>
			<DialogTrigger
				aria-label={count > 0 ? `Szűrők (${count} aktív)` : "Szűrők"}
				className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-white md:hidden"
			>
				<SlidersHorizontal aria-hidden="true" className="size-[18px]" />
				{count > 0 && (
					<span
						aria-hidden="true"
						className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
					>
						{count}
					</span>
				)}
			</DialogTrigger>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogTitle>Szűrők</DialogTitle>
				<DialogDescription className="sr-only">
					A lista szűrése; a változások azonnal érvényesek.
				</DialogDescription>
				{children}
				<DialogClose asChild>
					<Button className="mt-2 w-full">Kész</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}

function FilterChips({
	filters,
	events,
	onChange,
	onClearAll,
}: Omit<Props, "trailing">) {
	return (
		<>
			<ProgramChip
				events={events}
				selected={filters.eventIds}
				onChange={(eventIds) => onChange({ eventIds })}
			/>
			<AgeChip
				ageFrom={filters.ageFrom}
				ageTo={filters.ageTo}
				onChange={(ageFrom, ageTo) => onChange({ ageFrom, ageTo })}
			/>
			<TextChip
				label="Település"
				value={filters.hometown}
				placeholder="pl. Pécs"
				onChange={(hometown) => onChange({ hometown })}
			/>
			<FilterChip
				label="Hírlevél"
				value={
					filters.newsletter === undefined
						? undefined
						: filters.newsletter
							? "feliratkozott"
							: "nem iratkozott fel"
				}
				onClear={() => onChange({ newsletter: undefined })}
			>
				<BooleanOptions
					value={filters.newsletter}
					trueLabel="Feliratkozott"
					falseLabel="Nem iratkozott fel"
					onChange={(newsletter) => onChange({ newsletter })}
				/>
			</FilterChip>
			<FilterChip
				label="Részt vett"
				value={
					filters.attended === undefined
						? undefined
						: filters.attended
							? "igen"
							: "nem"
				}
				onClear={() => onChange({ attended: undefined })}
			>
				<BooleanOptions
					value={filters.attended}
					trueLabel="Volt már programon"
					falseLabel="Még nem vett részt"
					onChange={(attended) => onChange({ attended })}
				/>
			</FilterChip>
			{hasActiveFilters(filters) && (
				<Button variant="ghost" size="sm" onClick={onClearAll}>
					Szűrők törlése
				</Button>
			)}
		</>
	);
}

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
		<label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border-strong bg-white px-3 text-text-tertiary has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-coral md:h-8 md:w-64 md:flex-none">
			<Search aria-hidden="true" className="size-4" />
			<input
				type="search"
				aria-label={label}
				placeholder={placeholder}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none md:text-xs"
			/>
		</label>
	);
}

function ProgramChip({
	events,
	selected,
	onChange,
}: {
	events: EventOption[];
	selected: string[];
	onChange: (ids: string[]) => void;
}) {
	const names = selected.map(
		(id) => events.find((e) => e.id === id)?.name ?? "ismeretlen program",
	);
	const value =
		selected.length === 0
			? undefined
			: selected.length === 1
				? names[0]
				: `${selected.length} program`;

	return (
		<FilterChip label="Program" value={value} onClear={() => onChange([])}>
			{events.length === 0 ? (
				<p className="text-sm text-text-secondary">
					Nincs választható program.
				</p>
			) : (
				<fieldset className="flex max-h-72 flex-col gap-1 overflow-y-auto">
					<legend className="sr-only">Programok</legend>
					{events.map((event) => {
						const checked = selected.includes(event.id);
						return (
							<label
								key={event.id}
								className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-subtle"
							>
								<Checkbox
									checked={checked}
									onCheckedChange={() =>
										onChange(
											checked
												? selected.filter(
														(id) => id !== event.id,
													)
												: [...selected, event.id],
										)
									}
								/>
								{event.name}
							</label>
						);
					})}
				</fieldset>
			)}
		</FilterChip>
	);
}

function parseAge(raw: string): number | undefined {
	if (raw.trim() === "") return undefined;
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 && n <= 120 ? n : undefined;
}

function AgeChip({
	ageFrom,
	ageTo,
	onChange,
}: {
	ageFrom?: number;
	ageTo?: number;
	onChange: (ageFrom?: number, ageTo?: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const [from, setFrom] = useState(ageFrom?.toString() ?? "");
	const [to, setTo] = useState(ageTo?.toString() ?? "");
	const [error, setError] = useState<string | null>(null);
	const errorId = useId();

	const value =
		ageFrom === undefined && ageTo === undefined
			? undefined
			: ageFrom !== undefined && ageTo !== undefined
				? `${ageFrom}–${ageTo} év`
				: ageFrom !== undefined
					? `${ageFrom}+ év`
					: `legfeljebb ${ageTo} év`;

	return (
		<FilterChip
			label="Életkor"
			value={value}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setFrom(ageFrom?.toString() ?? "");
					setTo(ageTo?.toString() ?? "");
					setError(null);
				}
			}}
			onClear={() => onChange(undefined, undefined)}
		>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					const nextFrom = parseAge(from);
					const nextTo = parseAge(to);
					const rangeError = ageRangeError(nextFrom, nextTo);
					if (rangeError) {
						setError(rangeError);
						return;
					}
					onChange(nextFrom, nextTo);
					setOpen(false);
				}}
			>
				<div className="flex gap-2">
					<label className="flex flex-1 flex-col gap-1 text-xs font-medium">
						Minimum
						<Input
							type="number"
							min={0}
							max={120}
							inputMode="numeric"
							value={from}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? errorId : undefined}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</label>
					<label className="flex flex-1 flex-col gap-1 text-xs font-medium">
						Maximum
						<Input
							type="number"
							min={0}
							max={120}
							inputMode="numeric"
							value={to}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? errorId : undefined}
							onChange={(e) => setTo(e.target.value)}
						/>
					</label>
				</div>
				{error && (
					<p
						id={errorId}
						role="alert"
						className="text-xs text-error-fg"
					>
						{error}
					</p>
				)}
				<Button type="submit" size="sm" className="self-end">
					Alkalmaz
				</Button>
			</form>
		</FilterChip>
	);
}

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
