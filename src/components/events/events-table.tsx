"use client";

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CalendarX,
	MoreHorizontal,
	Pencil,
	Trash2,
	Users,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Pager } from "@/components/applicants/pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageSize } from "@/lib/applicants/list-params";
import { programColorClass } from "@/lib/applicants/format";
import { defaultColumnSettings, visibleColumns } from "@/lib/column-settings";
import {
	EVENT_COLUMN_CONFIG,
	type EventColumnId,
} from "@/lib/events/column-settings";
import { applicantsHref, eventEditHref, eventHref } from "@/lib/events/links";
import {
	defaultOrder,
	type EventSortKey,
	type EventTab,
	type SortOrder,
} from "@/lib/events/list-params";
import { PHASE_LABELS } from "@/lib/events/phase";
import { cn } from "@/lib/utils";
import type { EventDeleteTarget } from "./event-delete-dialog";
import {
	EVENT_COLUMNS,
	eventCardValue,
	eventTableMinWidth,
	EventTags,
} from "./event-columns";
import { EVENTS_TABLE_ID } from "./events-tabs";

/** Egy lista-elem a `GET /api/events` válaszának alakjában (ISO dátumok). */
export type EventListItem = {
	id: string;
	name: string;
	from: string;
	to: string;
	companyName: string | null;
	location: string | null;
	applicationSheetUrl: string | null;
	instructor: string | null;
	mentors: string[];
	tags: string[];
	capacity: number;
	applicationCounts: { total: number };
};

const headClass =
	"px-3 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase";

const DEFAULT_COLUMNS = visibleColumns(
	defaultColumnSettings(EVENT_COLUMN_CONFIG),
);

type Props = {
	items: EventListItem[];
	total: number;
	tab: EventTab;
	sort: EventSortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
	now: Date;
	/** Látható oszlopok sorrendben (oszlopbeállítás); a kártyák is ezt követik. */
	columns?: EventColumnId[];
	/** Új URL-állapot betöltése folyamatban. */
	pending?: boolean;
	filtersActive: boolean;
	onSort: (sort: EventSortKey, order: SortOrder) => void;
	onPage: (page: number) => void;
	onPageSize: (size: PageSize) => void;
	onClearFilters: () => void;
	onDelete?: (target: EventDeleteTarget) => void;
};

export function EventsTable({
	items,
	total,
	tab,
	sort,
	order,
	page,
	pageSize,
	now,
	columns = DEFAULT_COLUMNS,
	pending = false,
	filtersActive,
	onSort,
	onPage,
	onPageSize,
	onClearFilters,
	onDelete,
}: Props) {
	const sortProps = { sort, order, onSort };
	const itemLabel =
		tab === "all"
			? "program"
			: `${PHASE_LABELS[tab].toLocaleLowerCase("hu")} program`;

	return (
		<Card className="overflow-hidden">
			{/* Mobile (< md): program cards instead of the table (board 05.1 M). */}
			{items.length === 0 ? (
				<div className="px-4 py-10 md:hidden">
					<EventsEmptyState
						filtersActive={filtersActive}
						onClearFilters={onClearFilters}
					/>
				</div>
			) : (
				<ul
					aria-label="Programok"
					aria-busy={pending || undefined}
					className={cn(
						"divide-y divide-border-default transition-opacity md:hidden",
						pending && "opacity-60",
					)}
				>
					{items.map((item) => (
						<li key={item.id}>
							<EventCard
								item={item}
								now={now}
								columns={columns}
								onDelete={onDelete}
							/>
						</li>
					))}
				</ul>
			)}
			<div
				data-testid="events-table-frame"
				className="relative hidden overflow-x-auto md:block"
			>
				<table
					id={EVENTS_TABLE_ID}
					className={cn(
						"w-full table-fixed border-collapse text-sm transition-opacity",
						pending && "opacity-60",
					)}
					// Narrower viewports scroll inside the frame instead of
					// squeezing the columns.
					style={{ minWidth: `${eventTableMinWidth(columns)}px` }}
					aria-busy={pending || undefined}
				>
					<caption className="sr-only">Programok</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
							{columns.map((id) => {
								const column = EVENT_COLUMNS[id];
								const style = column.width
									? { width: `${column.width}px` }
									: undefined;
								return column.sortKey ? (
									<SortHeader
										key={id}
										{...sortProps}
										column={column.sortKey}
										label={column.label}
										style={style}
									/>
								) : (
									<th
										key={id}
										scope="col"
										className={headClass}
										style={style}
									>
										{column.label}
									</th>
								);
							})}
							<th scope="col" className="w-12 px-2 py-2.5">
								<span className="sr-only">Műveletek</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{items.length === 0 && (
							<tr>
								<td
									colSpan={columns.length + 1}
									className="px-6 py-12"
								>
									<EventsEmptyState
										filtersActive={filtersActive}
										onClearFilters={onClearFilters}
									/>
								</td>
							</tr>
						)}
						{items.map((item) => (
							<tr
								key={item.id}
								className="border-b border-border-default last:border-0 hover:bg-canvas"
							>
								{columns.map((id) => (
									<td
										key={id}
										className="px-3 py-2.5 align-middle"
									>
										{EVENT_COLUMNS[id].cell(item, now)}
									</td>
								))}
								<td className="px-2 py-2.5">
									<RowActions
										item={item}
										onDelete={onDelete}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 0 && (
				<Pager
					total={total}
					page={page}
					pageSize={pageSize}
					onPage={onPage}
					onPageSize={onPageSize}
					itemLabel={itemLabel}
				/>
			)}
		</Card>
	);
}

function RowActions({
	item,
	onDelete,
	className,
}: {
	item: EventListItem;
	onDelete?: (target: EventDeleteTarget) => void;
	className?: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={`Műveletek: ${item.name}`}
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
					className,
				)}
			>
				<MoreHorizontal aria-hidden="true" className="size-[18px]" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<Link href={applicantsHref(item.id)}>
						<Users aria-hidden="true" />
						Jelentkezők megtekintése
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href={eventEditHref(item.id)}>
						<Pencil aria-hidden="true" />
						Program szerkesztése
					</Link>
				</DropdownMenuItem>
				{onDelete && (
					<DropdownMenuItem
						className="text-error-fg focus:text-error-fg [&_svg]:text-error-fg!"
						onSelect={() =>
							onDelete({
								id: item.id,
								name: item.name,
								applications: item.applicationCounts.total,
							})
						}
					>
						<Trash2 aria-hidden="true" />
						Program törlése
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Mobil programkártya (terv: 05.1 M). A fejléc (név, címkék, műveletek)
 * mindig látszik; alatta minden további látható oszlop egy sor, az
 * oszlopbeállítás sorrendjében.
 */
function EventCard({
	item,
	now,
	columns,
	onDelete,
}: {
	item: EventListItem;
	now: Date;
	columns: EventColumnId[];
	onDelete?: (target: EventDeleteTarget) => void;
}) {
	const lines = columns.filter((id) => id !== EVENT_COLUMN_CONFIG.locked);
	return (
		<div className="flex flex-col gap-2.5 px-4 py-3.5">
			<div className="flex items-start gap-2">
				<span
					aria-hidden="true"
					className={cn(
						"mt-1.5 size-2 shrink-0 rounded-full",
						programColorClass(item.id),
					)}
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<Link
						href={eventHref(item.id)}
						className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
					>
						{item.name}
					</Link>
					<EventTags tags={item.tags} />
				</div>
				<RowActions
					item={item}
					onDelete={onDelete}
					className="size-11"
				/>
			</div>
			{lines.length > 0 && (
				<dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
					{lines.map((id) => (
						<div key={id} className="contents">
							<dt className="text-text-tertiary">
								{EVENT_COLUMNS[id].cardLabel}
							</dt>
							<dd className="min-w-0">
								{eventCardValue(id, item, now)}
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
}

function EventsEmptyState({
	filtersActive,
	onClearFilters,
}: {
	filtersActive: boolean;
	onClearFilters: () => void;
}) {
	return (
		<div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
			<span className="flex size-10 items-center justify-center rounded-full bg-sky-50">
				<CalendarX aria-hidden="true" className="size-5" />
			</span>
			<h2 className="text-[15px] leading-[22px] font-semibold">
				{filtersActive
					? "Nincs a szűrésnek megfelelő program"
					: "Ebben a szakaszban nincs program"}
			</h2>
			{filtersActive ? (
				<Button variant="surface" size="sm" onClick={onClearFilters}>
					Szűrők törlése
				</Button>
			) : (
				<p className="text-xs text-text-secondary">
					Nézd meg a többi fület, vagy hozz létre új programot.
				</p>
			)}
		</div>
	);
}

function SortHeader({
	sort,
	order,
	onSort,
	column,
	label,
	style,
}: {
	column: EventSortKey;
	label: string;
	style?: CSSProperties;
	sort: EventSortKey;
	order: SortOrder;
	onSort: (sort: EventSortKey, order: SortOrder) => void;
}) {
	const active = column === sort;
	const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={headClass}
			style={style}
			aria-sort={
				active ? (order === "asc" ? "ascending" : "descending") : "none"
			}
		>
			<button
				type="button"
				className="inline-flex items-center gap-1 uppercase hover:text-text-primary focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
				onClick={() =>
					onSort(
						column,
						active
							? order === "asc"
								? "desc"
								: "asc"
							: defaultOrder(column),
					)
				}
			>
				{label}
				<Icon
					aria-hidden="true"
					className={cn("size-3.5", !active && "opacity-50")}
				/>
			</button>
		</th>
	);
}
