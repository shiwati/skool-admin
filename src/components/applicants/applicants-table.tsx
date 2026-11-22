"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import type { SortKey } from "@/lib/applicants/list-params";
import type { PageSize, SortOrder } from "@/lib/list-state";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { openRowHref } from "@/lib/row-nav";
import { cn } from "@/lib/utils";
import { ApplicantCardList } from "./applicant-card-list";
import { applicantHref, COLUMNS, type ColumnId } from "./columns";
import { ListEmptyState, ListErrorState } from "@/components/list/list-state";
import { SortableTh, TH_CLASS } from "@/components/list/sortable-header";
import {
	type ListData,
	SkeletonRows,
	TableMessageRow,
} from "@/components/list/table-state-rows";
import { Pager } from "@/components/shared/pager";

export type TableData = ListData<ApplicantListItem>;

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

/** Új oszlopra váltáskor: dátum szerint a legújabb elöl, a többi A→Z. */
const initialOrder = (column: SortKey): SortOrder =>
	column === "createdAt" ? "desc" : "asc";

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
								if (sortKey === undefined) {
									return (
										<th
											key={id}
											scope="col"
											className={cn(
												TH_CLASS,
												column.widthClass,
											)}
										>
											{column.label}
										</th>
									);
								}
								return (
									<SortableTh
										key={id}
										column={sortKey}
										label={column.label}
										ariaLabel={
											column.subLabel
												? `${column.label} / ${column.subLabel.toLowerCase()}`
												: undefined
										}
										sort={sort}
										order={order}
										initialOrder={initialOrder}
										onSort={onSort}
										className={column.widthClass}
										contentClassName={column.headerClass}
									>
										{column.subLabel && (
											<span
												aria-hidden="true"
												className="font-normal"
											>
												{column.subLabel}
											</span>
										)}
									</SortableTh>
								);
							})}
						</tr>
					</thead>
					<tbody aria-busy={data.status === "loading" || undefined}>
						{data.status === "loading" && (
							<SkeletonRows columns={colSpan} />
						)}

						{data.status === "error" && (
							<TableMessageRow colSpan={colSpan}>
								<ListErrorState onReload={onReload} />
							</TableMessageRow>
						)}

						{data.status === "success" && items.length === 0 && (
							<TableMessageRow colSpan={colSpan}>
								<ListEmptyState
									filtersActive={filtersActive}
									onClearFilters={onClearFilters}
								/>
							</TableMessageRow>
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
