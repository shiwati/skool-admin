import Link from "next/link";
import type { ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { EMPTY, formatCount } from "@/lib/applicants/format";
import { AVATAR_CLASSES, tagClass } from "@/lib/events/colors";
import type { EventColumnId } from "@/lib/events/column-settings";
import {
	demandRatio,
	formatShortDateRange,
	formatRatio,
	ratioBadgeClass,
	ratioBarClass,
} from "@/lib/events/format";
import { eventHref } from "@/lib/events/links";
import type { EventSortKey } from "@/lib/events/list-params";
import {
	EVENT_STATUS_BADGE_CLASSES,
	EVENT_STATUS_LABELS,
	eventStatus,
} from "@/lib/events/phase";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";
import type { EventListItem } from "./events-table";

/** A Programok tábla egy oszlopa; sorrend és láthatóság: `lib/events/column-settings.ts`. */
export type EventColumnDef = {
	id: EventColumnId;
	/** Fejléc a táblában. */
	label: string;
	/** Felirat az oszlopválasztóban. */
	pickerLabel: string;
	/** Sor címkéje a mobil kártyán (terv: 05.1 M). */
	cardLabel: string;
	/** Nem rejthető el (a „Program”). */
	locked?: boolean;
	sortKey?: EventSortKey;
	/** Fix szélesség px-ben; hiányában a maradék helyet kapja. */
	width?: number;
	cell: (item: EventListItem, now: Date) => ReactNode;
	/** Érték a mobil kártyán, ha eltér a cellától. */
	card?: (item: EventListItem, now: Date) => ReactNode;
};

/** A szélesség nélküli „Program” oszlop legkisebb szélessége. */
export const NAME_MIN_WIDTH = 112;

export const EVENT_COLUMNS: Record<EventColumnId, EventColumnDef> = {
	name: {
		id: "name",
		label: "Program",
		pickerLabel: "Program (név, címkék)",
		cardLabel: "Program",
		locked: true,
		sortKey: "name",
		cell: (item) => (
			<div className="flex min-w-0 flex-col gap-1">
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								href={eventHref(item.id)}
								className="truncate font-medium hover:underline"
							>
								{item.name}
							</Link>
						</TooltipTrigger>
						<TooltipContent className="max-w-xs break-words">
							{item.name}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<EventTags tags={item.tags} />
			</div>
		),
	},
	date: {
		id: "date",
		label: "Időpont",
		pickerLabel: "Időpont",
		cardLabel: "Időpont",
		sortKey: "from",
		width: 150,
		cell: (item) => (
			<div className="font-mono text-xs leading-5">
				{formatShortDateRange(item.from, item.to)}
			</div>
		),
	},
	location: {
		id: "location",
		label: "Helyszín",
		pickerLabel: "Helyszín",
		cardLabel: "Helyszín",
		width: 190,
		cell: (item) => (
			<div className="min-w-0 truncate text-xs">
				{item.location ?? EMPTY}
			</div>
		),
	},
	company: {
		id: "company",
		label: "Cég",
		pickerLabel: "Cég / partner",
		cardLabel: "Cég",
		sortKey: "companyName",
		width: 160,
		cell: (item) => (
			<div className="min-w-0 truncate text-xs">
				{item.companyName ?? EMPTY}
			</div>
		),
	},
	demand: {
		id: "demand",
		label: "Jelentkezők · kapacitás",
		pickerLabel: "Jelentkezők · kapacitás",
		cardLabel: "Igény",
		sortKey: "capacity",
		width: 220,
		cell: (item) => <DemandCell item={item} />,
	},
	people: {
		id: "people",
		label: "Oktatók",
		pickerLabel: "Oktatók, mentorok",
		cardLabel: "Oktatók",
		width: 110,
		cell: (item) => <PeopleCell item={item} />,
	},
	status: {
		id: "status",
		label: "Státusz",
		pickerLabel: "Státusz",
		cardLabel: "Státusz",
		width: 170,
		cell: (item, now) => <StatusBadge item={item} now={now} />,
	},
};

/** Egy oszlop értéke a mobil kártyán: a `card` renderer, vagy a cella. */
export function eventCardValue(
	id: EventColumnId,
	item: EventListItem,
	now: Date,
): ReactNode {
	const column = EVENT_COLUMNS[id];
	return (column.card ?? column.cell)(item, now);
}

/** A tábla legkisebb szélessége a látható oszlopokkal (+ műveletek). */
export function eventTableMinWidth(columns: readonly EventColumnId[]): number {
	return columns.reduce(
		(sum, id) => sum + (EVENT_COLUMNS[id].width ?? NAME_MIN_WIDTH),
		48,
	);
}

/* Cell renderers, shared by the table row and the mobile card. */

function people(item: EventListItem) {
	return [item.instructor, ...item.mentors].filter((name): name is string =>
		Boolean(name?.trim()),
	);
}

export function EventTags({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-1">
			{tags.map((tag) => (
				<span
					key={tag}
					className={cn(
						"rounded-full px-2 text-xs leading-5 font-medium",
						tagClass(tag),
					)}
				>
					{tag}
				</span>
			))}
		</div>
	);
}

function DemandCell({ item }: { item: EventListItem }) {
	const applications = item.applicationCounts.total;
	const ratio = demandRatio(applications, item.capacity);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-2">
				<span className="flex-1 font-mono text-xs">
					{item.capacity > 0
						? `${formatCount(applications)} / ${formatCount(item.capacity)} fő`
						: `${formatCount(applications)} jelentkező`}
				</span>
				{ratio !== null && (
					<span
						className={cn(
							"rounded-full px-2 font-mono text-xs leading-5 font-medium",
							ratioBadgeClass(ratio),
						)}
						aria-label={`Túljelentkezés: ${formatRatio(ratio)}`}
					>
						{formatRatio(ratio)}
					</span>
				)}
			</div>
			{ratio !== null && (
				<div
					aria-hidden="true"
					className="h-1.5 overflow-hidden rounded-full bg-surface-subtle"
				>
					<span
						className={cn(
							"block h-full rounded-full",
							ratioBarClass(ratio),
						)}
						style={{
							width: `${Math.min(100, Math.round(ratio * 100))}%`,
						}}
					/>
				</div>
			)}
		</div>
	);
}

function PeopleCell({ item }: { item: EventListItem }) {
	const all = people(item);
	const shown = all.slice(0, 2);
	const more = all.length - shown.length;
	if (shown.length === 0) {
		return <span className="text-text-tertiary">{EMPTY}</span>;
	}
	return (
		<div
			className="flex items-center"
			aria-label={all.join(", ")}
			role="img"
		>
			{shown.map((name, i) => (
				<span
					key={`${name}-${i}`}
					title={name}
					className={cn(
						"flex size-[26px] items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold",
						AVATAR_CLASSES[i % AVATAR_CLASSES.length],
						i > 0 && "-ml-1.5",
					)}
				>
					{initials(name)}
				</span>
			))}
			{more > 0 && (
				<span className="ml-1.5 text-xs text-text-tertiary">
					+{more}
				</span>
			)}
		</div>
	);
}

function StatusBadge({ item, now }: { item: EventListItem; now: Date }) {
	const status = eventStatus(
		{ ...item, applications: item.applicationCounts.total },
		now,
	);
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 text-xs leading-5 font-medium whitespace-nowrap",
				EVENT_STATUS_BADGE_CLASSES[status],
			)}
		>
			<span
				aria-hidden="true"
				className="size-1.5 rounded-full bg-current"
			/>
			{EVENT_STATUS_LABELS[status]}
		</span>
	);
}
