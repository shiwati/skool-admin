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
import { EMPTY, formatCount, programColorClass } from "@/lib/applicants/format";
import { AVATAR_CLASSES, tagClass } from "@/lib/events/colors";
import {
	demandRatio,
	formatDateRange,
	formatRatio,
	ratioBadgeClass,
} from "@/lib/events/format";
import { applicantsHref, eventEditHref, eventHref } from "@/lib/events/links";
import {
	defaultOrder,
	type EventSortKey,
	type EventTab,
	type SortOrder,
} from "@/lib/events/list-params";
import {
	EVENT_STATUS_BADGE_CLASSES,
	EVENT_STATUS_LABELS,
	eventStatus,
	PHASE_LABELS,
} from "@/lib/events/phase";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";
import type { EventDeleteTarget } from "./event-delete-dialog";
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

type Props = {
	items: EventListItem[];
	total: number;
	tab: EventTab;
	sort: EventSortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
	now: Date;
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
			<div className="overflow-x-auto">
				<table
					id={EVENTS_TABLE_ID}
					className={cn(
						"w-full min-w-[1000px] table-fixed border-collapse text-sm transition-opacity",
						pending && "opacity-60",
					)}
					aria-busy={pending || undefined}
				>
					<caption className="sr-only">Programok</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
							<SortHeader
								{...sortProps}
								column="name"
								label="Program"
							/>
							<SortHeader
								{...sortProps}
								column="from"
								label="Időpont"
								className="w-[150px]"
							/>
							<th
								scope="col"
								className={cn(headClass, "w-[190px]")}
							>
								Helyszín
							</th>
							<SortHeader
								{...sortProps}
								column="capacity"
								label="Kapacitás · jelentkezők"
								className="w-[220px]"
							/>
							<th
								scope="col"
								className={cn(headClass, "w-[110px]")}
							>
								Oktatók
							</th>
							<th
								scope="col"
								className={cn(headClass, "w-[170px]")}
							>
								Státusz
							</th>
							<th scope="col" className="w-12 px-2 py-2.5">
								<span className="sr-only">Műveletek</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{items.length === 0 && (
							<tr>
								<td colSpan={7} className="px-6 py-12">
									<div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
										<span className="flex size-10 items-center justify-center rounded-full bg-sky-50">
											<CalendarX
												aria-hidden="true"
												className="size-5"
											/>
										</span>
										<h2 className="text-[15px] leading-[22px] font-semibold">
											{filtersActive
												? "Nincs a szűrésnek megfelelő program"
												: "Ebben a szakaszban nincs program"}
										</h2>
										{filtersActive ? (
											<Button
												variant="surface"
												size="sm"
												onClick={onClearFilters}
											>
												Szűrők törlése
											</Button>
										) : (
											<p className="text-xs text-text-secondary">
												Nézd meg a többi fület, vagy
												hozz létre új programot.
											</p>
										)}
									</div>
								</td>
							</tr>
						)}
						{items.map((item) => (
							<EventRow
								key={item.id}
								item={item}
								now={now}
								onDelete={onDelete}
							/>
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

function EventRow({
	item,
	now,
	onDelete,
}: {
	item: EventListItem;
	now: Date;
	onDelete?: (target: EventDeleteTarget) => void;
}) {
	const applications = item.applicationCounts.total;
	const ratio = demandRatio(applications, item.capacity);
	const status = eventStatus({ ...item, applications }, now);
	const people = [item.instructor, ...item.mentors].filter(
		(name): name is string => Boolean(name?.trim()),
	);
	const shown = people.slice(0, 2);
	const more = people.length - shown.length;

	return (
		<tr className="border-b border-border-default last:border-0 hover:bg-canvas">
			<td className="px-3 py-2.5 align-middle">
				<div className="flex min-w-0 flex-col gap-1">
					<Link
						href={eventHref(item.id)}
						className="truncate font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
					>
						{item.name}
					</Link>
					{item.tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{item.tags.map((tag) => (
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
					)}
				</div>
			</td>
			<td className="px-3 py-2.5 align-middle">
				<div className="font-mono text-xs">
					{formatDateRange(item.from, item.to)}
				</div>
			</td>
			<td className="px-3 py-2.5 align-middle text-xs">
				<div className="truncate">{item.location ?? EMPTY}</div>
				{item.companyName && (
					<div className="truncate text-text-tertiary">
						{item.companyName}
					</div>
				)}
			</td>
			<td className="px-3 py-2.5 align-middle">
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
									programColorClass(item.id),
								)}
								style={{
									width: `${Math.min(100, Math.round(ratio * 100))}%`,
								}}
							/>
						</div>
					)}
				</div>
			</td>
			<td className="px-3 py-2.5 align-middle">
				{shown.length === 0 ? (
					<span className="text-text-tertiary">{EMPTY}</span>
				) : (
					<div
						className="flex items-center"
						aria-label={people.join(", ")}
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
				)}
			</td>
			<td className="px-3 py-2.5 align-middle">
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
			</td>
			<td className="px-2 py-2.5">
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label={`Műveletek: ${item.name}`}
						className="flex size-8 items-center justify-center rounded-full hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
					>
						<MoreHorizontal
							aria-hidden="true"
							className="size-[18px]"
						/>
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
										applications,
									})
								}
							>
								<Trash2 aria-hidden="true" />
								Program törlése
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</td>
		</tr>
	);
}

function SortHeader({
	sort,
	order,
	onSort,
	column,
	label,
	className,
}: {
	column: EventSortKey;
	label: string;
	className?: string;
	sort: EventSortKey;
	order: SortOrder;
	onSort: (sort: EventSortKey, order: SortOrder) => void;
}) {
	const active = column === sort;
	const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={cn(headClass, className)}
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
