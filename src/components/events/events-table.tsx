"use client";

import { CalendarX, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { EmptyState } from "@/components/list/empty-state";
import { SortableTh, TH_CLASS } from "@/components/list/sortable-header";
import { TableMessageRow } from "@/components/list/table-state-rows";
import { Pager } from "@/components/shared/pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/lib/events/list-params";
import type { PageSize, SortOrder } from "@/lib/list-state";
import { PHASE_LABELS } from "@/lib/events/phase";
import { openRowHref } from "@/lib/row-nav";
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
	const router = useRouter();
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
								onOpen={(event) =>
									openRowHref(
										event,
										eventHref(item.id),
										router.push,
									)
								}
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
									<SortableTh
										key={id}
										{...sortProps}
										initialOrder={defaultOrder}
										column={column.sortKey}
										label={column.label}
										style={style}
									/>
								) : (
									<th
										key={id}
										scope="col"
										className={TH_CLASS}
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
							<TableMessageRow colSpan={columns.length + 1}>
								<EventsEmptyState
									filtersActive={filtersActive}
									onClearFilters={onClearFilters}
								/>
							</TableMessageRow>
						)}
						{items.map((item) => (
							<tr
								key={item.id}
								// The whole row opens the program; the name stays a real
								// link for keyboard users and opening in a new tab.
								onClick={(event) =>
									openRowHref(
										event,
										eventHref(item.id),
										router.push,
									)
								}
								className="cursor-pointer border-b border-border-default last:border-0 hover:bg-canvas"
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
					"flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-subtle",
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
	onOpen,
}: {
	item: EventListItem;
	now: Date;
	columns: EventColumnId[];
	onDelete?: (target: EventDeleteTarget) => void;
	/** Az egész kártya a programot nyitja (a „…” menü kivételével). */
	onOpen: (event: MouseEvent<HTMLDivElement>) => void;
}) {
	const lines = columns.filter((id) => id !== EVENT_COLUMN_CONFIG.locked);
	return (
		<div
			onClick={onOpen}
			className="flex cursor-pointer flex-col gap-2.5 px-4 py-3.5 active:bg-canvas"
		>
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
						className="font-medium hover:underline"
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
		<EmptyState
			icon={CalendarX}
			title={
				filtersActive
					? "Nincs a szűrésnek megfelelő program"
					: "Ebben a szakaszban nincs program"
			}
			description={
				!filtersActive &&
				"Nézd meg a többi fület, vagy hozz létre új programot."
			}
			action={
				filtersActive && (
					<Button
						variant="surface"
						size="sm"
						onClick={onClearFilters}
					>
						Szűrők törlése
					</Button>
				)
			}
		/>
	);
}
