"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ListErrorState } from "@/components/list/list-state";
import { SortableTh, TH_CLASS } from "@/components/list/sortable-header";
import {
	type ListData,
	SkeletonRows,
	TableMessageRow,
} from "@/components/list/table-state-rows";
import { Pager } from "@/components/shared/pager";
import { Checkbox } from "@/components/ui/checkbox";
import {
	ageFromBirthYear,
	fullName,
	isOver16,
	TAG_BADGE_CLASSES,
} from "@/lib/applicants/format";
import type { EventApplicationItem } from "@/lib/events/applications";
import type { ApplicationsSortKey as ApplicationSortKey } from "@/lib/events/applications-params";
import type { PageSize, SortOrder } from "@/lib/list-state";
import { openRowHref } from "@/lib/row-nav";
import { cn } from "@/lib/utils";
import { StatusCell } from "./status-cell";
import { EMPTY } from "@/lib/format";

export type ApplicationsData = ListData<EventApplicationItem>;

type Props = {
	data: ApplicationsData;
	selected: ReadonlySet<string>;
	sort: ApplicationSortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
	filtersActive: boolean;
	statusPending?: boolean;
	now?: Date;
	onSort: (sort: ApplicationSortKey, order: SortOrder) => void;
	onPage: (page: number) => void;
	onPageSize: (size: PageSize) => void;
	onToggleRow: (id: string, checked: boolean) => void;
	onToggleAll: (ids: string[], checked: boolean) => void;
	onChangeStatus: (
		item: EventApplicationItem,
		status: EventApplicationItem["status"],
	) => void;
	onClearFilters: () => void;
	onReload: () => void;
};

type Column = {
	label: string;
	sortKey?: ApplicationSortKey;
	subLabel?: string;
	className?: string;
};

const COLUMNS: Column[] = [
	{ label: "Név", sortKey: "name" },
	{ label: "Kor", sortKey: "age", className: "w-24" },
	{
		label: "Település",
		subLabel: "Iskola",
		className: "hidden md:table-cell",
	},
	{ label: "Hírlevél", className: "hidden w-24 md:table-cell" },
	{ label: "Státusz", sortKey: "status", className: "w-40" },
];

export function ApplicationsTable({
	data,
	selected,
	sort,
	order,
	page,
	pageSize,
	filtersActive,
	statusPending = false,
	now = new Date(),
	onSort,
	onPage,
	onPageSize,
	onToggleRow,
	onToggleAll,
	onChangeStatus,
	onClearFilters,
	onReload,
}: Props) {
	const router = useRouter();
	const items = data.status === "success" ? data.items : [];
	const colSpan = COLUMNS.length + 1;

	const pageIds = items.map((item) => item.id);
	const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
	const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
	const headerChecked: boolean | "indeterminate" = allSelected
		? true
		: selectedOnPage > 0
			? "indeterminate"
			: false;

	function openRow(
		event: MouseEvent<HTMLTableRowElement>,
		applicantId: string,
	) {
		openRowHref(event, `/applicants/${applicantId}`, router.push);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-border-default bg-white">
			<div className="relative overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<caption className="sr-only">Jelentkezések</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
							<th scope="col" className="w-10 px-3 py-2.5">
								<Checkbox
									aria-label="Az oldal összes jelentkezésének kijelölése"
									checked={headerChecked}
									disabled={pageIds.length === 0}
									onCheckedChange={() =>
										onToggleAll(
											pageIds,
											headerChecked !== true,
										)
									}
								/>
							</th>
							{COLUMNS.map((column) =>
								column.sortKey ? (
									<SortableTh
										key={column.label}
										column={column.sortKey}
										label={column.label}
										sort={sort}
										order={order}
										initialOrder={() => "asc"}
										onSort={onSort}
										className={column.className}
									/>
								) : (
									<th
										key={column.label}
										scope="col"
										className={cn(
											TH_CLASS,
											column.className,
										)}
									>
										{column.subLabel ? (
											<div className="flex flex-col items-start">
												<span>{column.label}</span>
												<span className="font-normal">
													{column.subLabel}
												</span>
											</div>
										) : (
											column.label
										)}
									</th>
								),
							)}
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
							<TableMessageRow
								colSpan={colSpan}
								className="text-center text-sm text-text-secondary"
							>
								{filtersActive ? (
									<>
										Nincs a szűrésnek megfelelő jelentkezés.{" "}
										<button
											type="button"
											className="text-info-fg underline underline-offset-2 hover:text-ink"
											onClick={onClearFilters}
										>
											Szűrő törlése
										</button>
									</>
								) : (
									"Még nincs jelentkező ehhez a programhoz."
								)}
							</TableMessageRow>
						)}

						{items.map((item) => {
							const { applicant } = item;
							const age = ageFromBirthYear(
								applicant.birthYear,
								now,
							);
							const checked = selected.has(item.id);
							return (
								<tr
									key={item.id}
									aria-selected={checked}
									onClick={(event) =>
										openRow(event, applicant.id)
									}
									className={cn(
										"cursor-pointer border-b border-border-default last:border-0 hover:bg-canvas",
										checked && "bg-sky-50",
									)}
								>
									<td
										className="px-3 py-2.5"
										data-row-nav="off"
									>
										<Checkbox
											aria-label={`${fullName(applicant)} kijelölése`}
											checked={checked}
											onCheckedChange={(value) =>
												onToggleRow(
													item.id,
													value === true,
												)
											}
										/>
									</td>
									<td className="px-3 py-2.5 font-medium">
										<Link
											href={`/applicants/${applicant.id}`}
											className="hover:underline"
										>
											{fullName(applicant)}
										</Link>
										{applicant.duplicateFlag && (
											<span className="ml-2 rounded-full bg-peach px-2 text-xs leading-5 font-normal">
												Duplikátum?
											</span>
										)}
									</td>
									<td className="px-3 py-2.5 font-mono">
										{age === null ? EMPTY : age}
										{isOver16(age) && (
											<span
												className={cn(
													"ml-1.5 rounded-full px-1.5 text-[11px] leading-4",
													TAG_BADGE_CLASSES.over16,
												)}
											>
												16+
											</span>
										)}
									</td>
									<td className="hidden max-w-[16rem] px-3 py-2.5 md:table-cell">
										{applicant.hometown ||
										applicant.schoolName ? (
											<div className="min-w-0 text-xs">
												<div className="truncate">
													{applicant.hometown ??
														EMPTY}
												</div>
												{applicant.schoolName && (
													<div className="truncate text-text-tertiary">
														{applicant.schoolName}
													</div>
												)}
											</div>
										) : (
											EMPTY
										)}
									</td>
									<td className="hidden px-3 py-2.5 md:table-cell">
										{applicant.newsletter ? (
											<Check
												role="img"
												aria-label="Feliratkozott"
												className="size-4 text-success-fg"
											/>
										) : (
											<span className="text-text-tertiary">
												{EMPTY}
											</span>
										)}
									</td>
									<td
										className="px-3 py-2.5"
										data-row-nav="off"
									>
										<StatusCell
											name={fullName(applicant)}
											status={item.status}
											disabled={statusPending}
											onChange={(status) =>
												onChangeStatus(item, status)
											}
										/>
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
					itemLabel="jelentkezés"
				/>
			)}
		</div>
	);
}
