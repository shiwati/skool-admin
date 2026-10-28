"use client";

import {
	flexRender,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	useTable,
	type ColumnDef,
	type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		text: sortFn_text,
		datetime: sortFn_datetime,
	},
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
});

export type DataTableColumn<TData extends RowData> = ColumnDef<
	typeof features,
	TData
>;

export function DataTable<TData extends RowData>({
	columns,
	data,
	caption,
}: {
	columns: DataTableColumn<TData>[];
	data: TData[];
	caption: string;
}) {
	const table = useTable({
		features,
		data,
		columns,
		sortDescFirst: false,
	});

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto rounded-md border">
				<table className="w-full text-sm">
					<caption className="sr-only">{caption}</caption>
					<thead className="border-b bg-muted">
						{table.getHeaderGroups().map((group) => (
							<tr key={group.id}>
								{group.headers.map((header) => (
									<th
										key={header.id}
										className="h-12 px-4 text-left font-medium"
										scope="col"
										aria-sort={
											header.column.getIsSorted() ===
											"asc"
												? "ascending"
												: header.column.getIsSorted() ===
													  "desc"
													? "descending"
													: "none"
										}
									>
										{header.isPlaceholder ? null : header.column.getCanSort() ? (
											<button
												type="button"
												className="inline-flex items-center gap-2"
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef
														.header,
													header.getContext(),
												)}
												{header.column.getIsSorted() ===
												"asc" ? (
													<ArrowUp
														className="size-4"
														aria-hidden="true"
													/>
												) : header.column.getIsSorted() ===
												  "desc" ? (
													<ArrowDown
														className="size-4"
														aria-hidden="true"
													/>
												) : (
													<ArrowUpDown
														className="size-4"
														aria-hidden="true"
													/>
												)}
											</button>
										) : (
											flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="border-b last:border-0"
								>
									{row.getAllCells().map((cell) => (
										<td key={cell.id} className="p-4">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="flex items-center justify-end gap-2">
				<span
					className="mr-2 text-sm text-muted-foreground"
					aria-live="polite"
				>
					Page {table.state.pagination.pageIndex + 1} of{" "}
					{Math.max(1, table.getPageCount())}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
