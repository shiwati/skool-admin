"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	PageSize,
	SortKey,
	SortOrder,
} from "@/lib/applicants/list-params";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { openRowHref } from "@/lib/row-nav";
import { cn } from "@/lib/utils";
import { ApplicantCardList } from "./applicant-card-list";
import { applicantHref, COLUMNS, type ColumnId } from "./columns";
import { ListEmptyState, ListErrorState } from "./list-state";
import { Pager } from "@/components/shared/pager";

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
	filtersActive: boolean;
	now?: Date;
	onSort: (sort: SortKey, order: SortOrder) => void;
	onPage: (page: number) => void;
	onPageSize: (size: PageSize) => void;
	onClearFilters: () => void;
	onReload: () => void;
};

const SKELETON_ROWS = 6;

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
	filtersActive,
	now = new Date(),
	onSort,
	onPage,
	onPageSize,
	onClearFilters,
	onReload,
}: Props) {
	const router = useRouter();

	function openRow(event: MouseEvent<HTMLTableRowElement>, id: string) {
		openRowHref(event, applicantHref(id), router.push);
	}

	const items = data.status === "success" ? data.items : [];
	const colSpan = columns.length;

	return (
		<Card className="overflow-hidden">
			{/* Mobile (< md): card list instead of the table (board 03.1 M). */}
			<ApplicantCardList
				className="md:hidden"
				data={data}
				now={now}
				columns={columns}
				filtersActive={filtersActive}
				onClearFilters={onClearFilters}
				onReload={onReload}
			/>
			<div
				data-testid="table-frame"
				className="relative hidden overflow-x-auto md:block"
			>
				<table
					className="w-full table-fixed border-collapse text-sm"
					// Narrower viewports scroll inside the frame instead of
					// squeezing the user's columns.
					style={{ minWidth: `${columns.length * 128}px` }}
				>
					<caption className="sr-only">Jelentkezők</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
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
												className="inline-flex items-center gap-1 uppercase hover:text-text-primary"
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
									{columns.map((id) => (
										<td key={id} className="px-3 py-3">
											<Skeleton className="h-3.5 w-3/4" />
										</td>
									))}
								</tr>
							))}

						{data.status === "error" && (
							<tr>
								<td colSpan={colSpan} className="px-6 py-12">
									<ListErrorState onReload={onReload} />
								</td>
							</tr>
						)}

						{data.status === "success" && items.length === 0 && (
							<tr>
								<td colSpan={colSpan} className="px-6 py-12">
									<ListEmptyState
										filtersActive={filtersActive}
										onClearFilters={onClearFilters}
									/>
								</td>
							</tr>
						)}

						{items.map((item) => {
							return (
								<tr
									key={item.id}
									onClick={(event) => openRow(event, item.id)}
									className="cursor-pointer border-b border-border-default last:border-0 hover:bg-canvas"
								>
									{columns.map((id) => (
										<td
											key={id}
											className="px-3 py-2.5 align-middle"
										>
											{COLUMNS[id].cell(item, now)}
										</td>
									))}
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
