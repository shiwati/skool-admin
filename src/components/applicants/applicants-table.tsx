"use client";

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CircleAlert,
	MoreHorizontal,
	SearchX,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { fullName } from "@/lib/applicants/format";
import type {
	PageSize,
	SortKey,
	SortOrder,
} from "@/lib/applicants/list-params";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";
import { applicantHref, COLUMNS, type ColumnId } from "./columns";
import { Pager } from "./pager";

export type TableData =
	| { status: "loading" }
	| { status: "error" }
	| { status: "success"; items: ApplicantListItem[]; total: number };

type Props = {
	data: TableData;
	columns: ColumnId[];
	sort: SortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
	selected: ReadonlySet<string>;
	filtersActive: boolean;
	now?: Date;
	onSort: (sort: SortKey, order: SortOrder) => void;
	onPage: (page: number) => void;
	onPageSize: (size: PageSize) => void;
	onToggleRow: (id: string) => void;
	onToggleAll: (ids: string[], select: boolean) => void;
	onDeleteRow: (item: ApplicantListItem) => void;
	onClearFilters: () => void;
	onReload: () => void;
};

const SKELETON_ROWS = 6;

/**
 * Clicks on (or inside) these keep their own behaviour instead of opening the
 * detail page. Menu items are portaled, but React events still bubble to the row.
 */
const ROW_NAV_IGNORE =
	'a, button, input, label, [role="checkbox"], [role="menuitem"], [role="menu"], [data-row-nav="off"]';

function nextOrder(
	column: SortKey,
	sort: SortKey,
	order: SortOrder,
): SortOrder {
	if (column !== sort) return column === "createdAt" ? "desc" : "asc";
	return order === "asc" ? "desc" : "asc";
}

export function ApplicantsTable({
	data,
	columns,
	sort,
	order,
	page,
	pageSize,
	selected,
	filtersActive,
	now = new Date(),
	onSort,
	onPage,
	onPageSize,
	onToggleRow,
	onToggleAll,
	onDeleteRow,
	onClearFilters,
	onReload,
}: Props) {
	const router = useRouter();

	function openRow(event: MouseEvent<HTMLTableRowElement>, id: string) {
		const target = event.target;
		if (target instanceof Element && target.closest(ROW_NAV_IGNORE)) return;
		// Selecting text in a cell is not a click on the row.
		if (window.getSelection()?.toString()) return;
		const href = applicantHref(id);
		if (event.ctrlKey || event.metaKey) window.open(href, "_blank");
		else router.push(href);
	}

	const items = data.status === "success" ? data.items : [];
	const ids = items.map((item) => item.id);
	const selectedOnPage = ids.filter((id) => selected.has(id)).length;
	const headerChecked =
		ids.length > 0 && selectedOnPage === ids.length
			? true
			: selectedOnPage > 0
				? "indeterminate"
				: false;
	const colSpan = columns.length + 2;

	return (
		<Card className="overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full table-fixed border-collapse text-sm">
					<caption className="sr-only">Jelentkezők</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
							<th scope="col" className="w-11 px-3 py-2.5">
								<Checkbox
									aria-label="Összes kijelölése"
									checked={headerChecked}
									disabled={ids.length === 0}
									onCheckedChange={() =>
										onToggleAll(ids, headerChecked !== true)
									}
								/>
							</th>
							{columns.map((id) => {
								const column = COLUMNS[id];
								const sortKey = column.sortKey;
								const active =
									sortKey !== undefined && sortKey === sort;
								return (
									<th
										key={id}
										scope="col"
										className={cn(
											"px-3 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase",
											column.widthClass,
										)}
										aria-sort={
											sortKey === undefined
												? undefined
												: active
													? order === "asc"
														? "ascending"
														: "descending"
													: "none"
										}
									>
										{sortKey ? (
											<button
												type="button"
												className="inline-flex items-center gap-1 uppercase hover:text-text-primary focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
												onClick={() =>
													onSort(
														sortKey,
														nextOrder(
															sortKey,
															sort,
															order,
														),
													)
												}
											>
												{column.label}
												{active ? (
													order === "asc" ? (
														<ArrowUp
															aria-hidden="true"
															className="size-3.5"
														/>
													) : (
														<ArrowDown
															aria-hidden="true"
															className="size-3.5"
														/>
													)
												) : (
													<ArrowUpDown
														aria-hidden="true"
														className="size-3.5 opacity-50"
													/>
												)}
											</button>
										) : (
											column.label
										)}
									</th>
								);
							})}
							<th scope="col" className="w-12 px-2 py-2.5">
								<span className="sr-only">Műveletek</span>
							</th>
						</tr>
					</thead>
					<tbody aria-busy={data.status === "loading" || undefined}>
						{data.status === "loading" &&
							Array.from({ length: SKELETON_ROWS }, (_, i) => (
								<tr
									key={i}
									className="border-b border-border-default last:border-0"
									data-testid="skeleton-row"
								>
									<td className="px-3 py-3">
										<Skeleton className="size-4" />
									</td>
									{columns.map((id) => (
										<td key={id} className="px-3 py-3">
											<Skeleton className="h-3.5 w-3/4" />
										</td>
									))}
									<td />
								</tr>
							))}

						{data.status === "error" && (
							<tr>
								<td colSpan={colSpan} className="px-6 py-12">
									<div
										role="alert"
										className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center"
									>
										<span className="flex size-10 items-center justify-center rounded-full bg-error-bg text-error-fg">
											<CircleAlert
												aria-hidden="true"
												className="size-5"
											/>
										</span>
										<h2 className="text-[15px] leading-[22px] font-semibold">
											Nem sikerült betölteni a listát
										</h2>
										<p className="text-xs text-text-secondary">
											Hálózati hiba, vagy a szerver nem
											válaszol. Próbáld újra.
										</p>
										<Button
											variant="surface"
											size="sm"
											onClick={onReload}
										>
											Újratöltés
										</Button>
									</div>
								</td>
							</tr>
						)}

						{data.status === "success" && items.length === 0 && (
							<tr>
								<td colSpan={colSpan} className="px-6 py-12">
									<div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
										<span className="flex size-10 items-center justify-center rounded-full bg-sky-50">
											<SearchX
												aria-hidden="true"
												className="size-5"
											/>
										</span>
										<h2 className="text-[15px] leading-[22px] font-semibold">
											Nincs a szűrésnek megfelelő
											jelentkező
										</h2>
										{filtersActive && (
											<Button
												variant="surface"
												size="sm"
												onClick={onClearFilters}
											>
												Szűrők törlése
											</Button>
										)}
									</div>
								</td>
							</tr>
						)}

						{items.map((item) => {
							const isSelected = selected.has(item.id);
							const name = fullName(item);
							return (
								<tr
									key={item.id}
									aria-selected={isSelected}
									onClick={(event) => openRow(event, item.id)}
									className={cn(
										"cursor-pointer border-b border-border-default last:border-0",
										isSelected
											? "bg-sky-50"
											: "hover:bg-canvas",
									)}
								>
									<td
										className="px-3 py-2.5"
										data-row-nav="off"
									>
										<Checkbox
											aria-label={`${name} kijelölése`}
											checked={isSelected}
											onCheckedChange={() =>
												onToggleRow(item.id)
											}
										/>
									</td>
									{columns.map((id) => (
										<td
											key={id}
											className="px-3 py-2.5 align-middle"
										>
											{COLUMNS[id].cell(item, now)}
										</td>
									))}
									<td
										className="px-2 py-2.5"
										data-row-nav="off"
									>
										<DropdownMenu>
											<DropdownMenuTrigger
												aria-label={`Műveletek: ${name}`}
												className="flex size-8 items-center justify-center rounded-full hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
											>
												<MoreHorizontal
													aria-hidden="true"
													className="size-[18px]"
												/>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													className="text-error-fg focus:text-error-fg [&_svg]:text-error-fg!"
													onSelect={() =>
														onDeleteRow(item)
													}
												>
													<Trash2 aria-hidden="true" />
													Jelentkező törlése
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			{data.status === "success" && data.total > 0 && (
				<Pager
					total={data.total}
					page={page}
					pageSize={pageSize}
					onPage={onPage}
					onPageSize={onPageSize}
				/>
			)}
		</Card>
	);
}
