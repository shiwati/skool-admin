"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilterChip } from "@/components/list/filter-chip";
import { feedbackSearch, type FeedbackUrlState } from "@/lib/feedback/format";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";

const ROLES = Object.keys(ROLE_LABELS) as FeedbackRoleKey[];

function Option({
	name,
	checked,
	label,
	onSelect,
	wrap = false,
}: {
	name: string;
	checked: boolean;
	label: string;
	/** Hosszú címkénél levágás helyett sortörés. */
	wrap?: boolean;
	onSelect: () => void;
}) {
	return (
		<label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-subtle">
			<input
				type="radio"
				name={name}
				checked={checked}
				onChange={onSelect}
				className="shrink-0 accent-ink"
			/>
			<span className={wrap ? "min-w-0 break-words" : "min-w-0 truncate"}>
				{label}
			</span>
		</label>
	);
}

/**
 * Keresés és szűrők; az állapot az URL-ben él, a lista a szerveren
 * töltődik újra. Szűréskor az első oldalra ugrik, a fiók bezárul.
 */
export function FeedbackToolbar({
	state,
	events,
	companies,
	periods,
}: {
	state: FeedbackUrlState;
	/** Az időszakszűrő opciói (naptári évek); `undefined` a program saját fülén. */
	periods?: { key: string; label: string }[];
	/** A programszűrő opciói; `undefined`, ha a nézet egy programra szűkített. */
	events?: { id: string; name: string }[];
	/** A cégszűrő opciói; `undefined`, ha a nézet egy programra szűkített. */
	companies?: string[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();
	const [q, setQ] = useState(state.q ?? "");
	const [openChip, setOpenChip] = useState<
		"role" | "event" | "company" | "period" | null
	>(null);

	function go(patch: FeedbackUrlState) {
		setOpenChip(null);
		const next = { ...state, ...patch, page: 1, open: undefined };
		startTransition(() =>
			router.replace(`${pathname}${feedbackSearch(next)}`, {
				scroll: false,
			}),
		);
	}

	const eventName = events?.find((e) => e.id === state.eventId)?.name;
	const periodLabel = state.period
		? (periods?.find((p) => p.key === state.period)?.label ?? state.period)
		: undefined;

	return (
		<div
			className="flex flex-wrap items-center gap-2"
			aria-busy={pending || undefined}
		>
			<form
				role="search"
				onSubmit={(e) => {
					e.preventDefault();
					go({ q: q.trim() || undefined });
				}}
			>
				<label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-full border border-border-strong bg-white px-3 text-text-tertiary md:h-8 md:w-72">
					<Search aria-hidden="true" className="size-4" />
					<input
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="Keresés a szöveges válaszokban"
						placeholder="Keresés a szöveges válaszokban…"
						className="min-w-0 flex-1 bg-transparent text-sm text-text-primary md:text-xs"
					/>
				</label>
			</form>
			<FilterChip
				label="Kitöltő"
				value={state.role ? ROLE_LABELS[state.role] : undefined}
				onClear={() => go({ role: undefined })}
				open={openChip === "role"}
				onOpenChange={(open) => setOpenChip(open ? "role" : null)}
			>
				<fieldset className="flex min-w-0 flex-col gap-1">
					<legend className="sr-only">Kitöltő</legend>
					<Option
						name="role"
						label="Mindenki"
						checked={!state.role}
						onSelect={() => go({ role: undefined })}
					/>
					{ROLES.map((role) => (
						<Option
							key={role}
							name="role"
							label={ROLE_LABELS[role]}
							checked={state.role === role}
							onSelect={() => go({ role })}
						/>
					))}
				</fieldset>
			</FilterChip>
			{periods && (
				<FilterChip
					label="Időszak"
					value={periodLabel}
					onClear={() => go({ period: undefined })}
					open={openChip === "period"}
					onOpenChange={(open) => setOpenChip(open ? "period" : null)}
				>
					<fieldset className="flex min-w-0 flex-col gap-1">
						<legend className="sr-only">
							Időszak (a program kezdete szerint)
						</legend>
						<Option
							name="period"
							label="Teljes időszak"
							checked={!state.period}
							onSelect={() => go({ period: undefined })}
						/>
						{periods.map((p) => (
							<Option
								key={p.key}
								name="period"
								label={p.label}
								checked={state.period === p.key}
								onSelect={() => go({ period: p.key })}
							/>
						))}
					</fieldset>
					<p className="mt-2 px-2 text-xs text-text-tertiary">
						A program kezdete szerint.
					</p>
				</FilterChip>
			)}
			{events && (
				<FilterChip
					label="Program"
					value={
						eventName ?? (state.eventId ? "ismeretlen" : undefined)
					}
					onClear={() => go({ eventId: undefined })}
					open={openChip === "event"}
					onOpenChange={(open) => setOpenChip(open ? "event" : null)}
					contentClassName="w-[min(28rem,calc(100vw-2rem))]"
				>
					{events.length === 0 ? (
						<p className="text-sm text-text-secondary">
							Még egyik programhoz sincs visszajelzés.
						</p>
					) : (
						<fieldset className="flex max-h-72 min-w-0 flex-col gap-1 overflow-y-auto">
							<legend className="sr-only">Program</legend>
							<Option
								name="event"
								label="Minden program"
								checked={!state.eventId}
								onSelect={() => go({ eventId: undefined })}
							/>
							{events.map((event) => (
								<Option
									key={event.id}
									name="event"
									label={event.name}
									wrap
									checked={state.eventId === event.id}
									onSelect={() => go({ eventId: event.id })}
								/>
							))}
						</fieldset>
					)}
				</FilterChip>
			)}
			{companies && (
				<FilterChip
					label="Cég"
					value={state.company}
					onClear={() => go({ company: undefined })}
					open={openChip === "company"}
					onOpenChange={(open) =>
						setOpenChip(open ? "company" : null)
					}
					contentClassName="w-[min(28rem,calc(100vw-2rem))]"
				>
					{companies.length === 0 ? (
						<p className="text-sm text-text-secondary">
							Még egyik céghez sincs visszajelzés.
						</p>
					) : (
						<fieldset className="flex max-h-72 min-w-0 flex-col gap-1 overflow-y-auto">
							<legend className="sr-only">Cég</legend>
							<Option
								name="company"
								label="Minden cég"
								checked={!state.company}
								onSelect={() => go({ company: undefined })}
							/>
							{companies.map((company) => (
								<Option
									key={company}
									name="company"
									label={company}
									wrap
									checked={state.company === company}
									onSelect={() => go({ company })}
								/>
							))}
						</fieldset>
					)}
				</FilterChip>
			)}
		</div>
	);
}
