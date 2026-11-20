"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilterChip } from "@/components/applicants/filter-chip";
import { feedbackSearch, type FeedbackUrlState } from "@/lib/feedback/format";
import { ROLE_LABELS, type FeedbackRoleKey } from "@/lib/feedback/questions";

const ROLES = Object.keys(ROLE_LABELS) as FeedbackRoleKey[];

function Option({
	name,
	checked,
	label,
	onSelect,
}: {
	name: string;
	checked: boolean;
	label: string;
	onSelect: () => void;
}) {
	return (
		<label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-subtle">
			<input
				type="radio"
				name={name}
				checked={checked}
				onChange={onSelect}
				className="accent-ink"
			/>
			<span className="min-w-0 truncate">{label}</span>
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
}: {
	state: FeedbackUrlState;
	/** A programszűrő opciói; `undefined`, ha a nézet egy programra szűkített. */
	events?: { id: string; name: string }[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();
	const [q, setQ] = useState(state.q ?? "");
	const [openChip, setOpenChip] = useState<"role" | "event" | null>(null);

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
				<label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-full border border-border-strong bg-white px-3 text-text-tertiary focus-within:ring-2 focus-within:ring-ink md:h-8 md:w-72">
					<Search aria-hidden="true" className="size-4" />
					<input
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="Keresés a szöveges válaszokban"
						placeholder="Keresés a szöveges válaszokban…"
						className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none md:text-xs"
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
				<fieldset className="flex flex-col gap-1">
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
			{events && (
				<FilterChip
					label="Program"
					value={
						eventName ?? (state.eventId ? "ismeretlen" : undefined)
					}
					onClear={() => go({ eventId: undefined })}
					open={openChip === "event"}
					onOpenChange={(open) => setOpenChip(open ? "event" : null)}
				>
					{events.length === 0 ? (
						<p className="text-sm text-text-secondary">
							Még egyik programhoz sincs visszajelzés.
						</p>
					) : (
						<fieldset className="flex max-h-72 flex-col gap-1 overflow-y-auto">
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
									checked={state.eventId === event.id}
									onSelect={() => go({ eventId: event.id })}
								/>
							))}
						</fieldset>
					)}
				</FilterChip>
			)}
		</div>
	);
}
