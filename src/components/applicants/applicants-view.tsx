"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useApplicants } from "@/hooks/use-applicants";
import { useColumnSettings } from "@/hooks/use-column-settings";
import { csvFilename, useCsvExport } from "@/hooks/use-csv-export";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import {
	APPLICANT_COLUMN_CONFIG,
	visibleColumns,
} from "@/lib/applicants/column-settings";
import { buildApplicantsCsv } from "@/lib/applicants/export";
import {
	clearFilters,
	hasActiveFilters,
	parseListState,
	toApiQuery,
	toSearchParams,
	updateListState,
	type ListState,
} from "@/lib/applicants/list-params";
import type {
	ApplicantListItem,
	ApplicantsPage,
	EventOption,
} from "@/lib/applicants/types";
import { ApplicantsHeader } from "./applicants-header";
import { ApplicantsTable, type TableData } from "./applicants-table";
import { ApplicantsToolbar } from "./applicants-toolbar";
import { ColumnPicker } from "./column-picker";
import { DuplicateBanner } from "./duplicate-banner";
import { DuplicateReviewDialog } from "./duplicate-review-dialog";
import { EmailListDialog } from "./email-list-dialog";

/** A szerveren már lekért első oldal, és a query, amire válaszol. */
export type InitialApplicants = { apiQuery: string; data: ApplicantsPage };

export function ApplicantsView({
	initial,
	years = [],
	events = [],
	duplicateCount: initialDuplicateCount = null,
}: {
	initial?: InitialApplicants;
	/** A „Program éve” választó évei (a szerver a DB-ből adja). */
	years?: number[];
	/** A „Program” szűrő választható programjai (a szerver adja). */
	events?: EventOption[];
	/** Eldöntetlen duplikátumpárok száma a bannerhez; `null`: nem ismert. */
	duplicateCount?: number | null;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchKey = searchParams.toString();
	const state = useMemo(
		() => parseListState(new URLSearchParams(searchKey)),
		[searchKey],
	);

	const applicants = useApplicants(toApiQuery(state).toString(), initial);
	const [duplicateCount, setDuplicateCount] = useState(initialDuplicateCount);
	const [duplicatesOpen, setDuplicatesOpen] = useState(false);
	const [duplicatesRun, setDuplicatesRun] = useState(0);
	const [columnSettings, setColumnSettings] = useColumnSettings(
		APPLICANT_COLUMN_CONFIG,
	);
	const csvExport = useCsvExport();

	const [emailListOpen, setEmailListOpen] = useState(false);
	// Bumped on every open so the dialog remounts with fresh state.
	const [emailListRun, setEmailListRun] = useState(0);

	// Native history API: Next syncs `useSearchParams` without re-rendering
	// the page on the server, so the list is queried only once, by
	// `useApplicants` (the server renders just the first load).
	const navigate = useCallback(
		(next: ListState) => {
			const query = toSearchParams(next).toString();
			window.history.replaceState(
				null,
				"",
				query ? `${pathname}?${query}` : pathname,
			);
		},
		[pathname],
	);
	const change = (patch: Partial<ListState>) =>
		navigate(updateListState(state, patch));

	const tableData: TableData =
		applicants.status === "success"
			? {
					status: "success",
					items: applicants.data.items,
					total: applicants.data.total,
				}
			: { status: applicants.status };

	// A szűrt találatok mindegyike, a felhasználó által beállított oszlopokkal.
	function exportCsv() {
		const columns = visibleColumns(columnSettings);
		void csvExport.run(csvFilename("jelentkezok"), async (signal) => {
			const all = await fetchAllPages<ApplicantListItem>(
				(page, pageSize) =>
					`/api/applicants?${toApiQuery(state, { page, pageSize })}`,
				signal,
			);
			return {
				csv: buildApplicantsCsv(all, columns),
				rows: all.length,
			};
		});
	}

	return (
		<>
			<ApplicantsHeader
				total={
					applicants.status === "success"
						? applicants.data.total
						: null
				}
				filtered={hasActiveFilters(state)}
				onEmailList={() => {
					setEmailListRun((n) => n + 1);
					setEmailListOpen(true);
				}}
				onExport={exportCsv}
				exporting={csvExport.exporting}
			/>
			<DuplicateBanner
				count={duplicateCount}
				onReview={() => {
					setDuplicatesRun((n) => n + 1);
					setDuplicatesOpen(true);
				}}
			/>
			<ApplicantsToolbar
				filters={state}
				events={events}
				years={years}
				onChange={change}
				onClearAll={() => navigate(clearFilters(state))}
				trailing={
					<ColumnPicker
						settings={columnSettings}
						onChange={setColumnSettings}
					/>
				}
				// Same settings: the mobile cards follow them too.
				mobileTrailing={
					<ColumnPicker
						compact
						settings={columnSettings}
						onChange={setColumnSettings}
					/>
				}
			/>
			<ApplicantsTable
				data={tableData}
				columns={visibleColumns(columnSettings)}
				sort={state.sort}
				order={state.order}
				page={state.page}
				pageSize={state.pageSize}
				filtersActive={hasActiveFilters(state)}
				onSort={(sort, order) => change({ sort, order })}
				onPage={(page) => change({ page })}
				onPageSize={(pageSize) => change({ pageSize })}
				onClearFilters={() => navigate(clearFilters(state))}
				onReload={applicants.reload}
			/>
			<EmailListDialog
				key={`email-${emailListRun}`}
				open={emailListOpen}
				onOpenChange={setEmailListOpen}
				state={state}
			/>
			<DuplicateReviewDialog
				key={`duplicates-${duplicatesRun}`}
				open={duplicatesOpen}
				onOpenChange={setDuplicatesOpen}
				onChanged={(remaining) => {
					setDuplicateCount(remaining);
					applicants.reload();
				}}
			/>
		</>
	);
}
