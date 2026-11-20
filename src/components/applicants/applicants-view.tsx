"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApplicants } from "@/hooks/use-applicants";
import { useColumnSettings } from "@/hooks/use-column-settings";
import { csvFilename, useCsvExport } from "@/hooks/use-csv-export";
import { apiFetch } from "@/lib/api/client";
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
	DuplicatesResponse,
	EventOption,
} from "@/lib/applicants/types";
import { ApplicantsHeader } from "./applicants-header";
import { ApplicantsTable, type TableData } from "./applicants-table";
import { ApplicantsToolbar } from "./applicants-toolbar";
import { ColumnPicker } from "./column-picker";
import { DuplicateBanner } from "./duplicate-banner";
import { DuplicateReviewDialog } from "./duplicate-review-dialog";
import { EmailListDialog } from "./email-list-dialog";

function useEventOptions(): EventOption[] {
	const [events, setEvents] = useState<EventOption[]>([]);
	useEffect(() => {
		const controller = new AbortController();
		apiFetch<{ items: EventOption[] }>(
			"/api/events?pageSize=100&sort=from&order=desc",
			{ signal: controller.signal },
		)
			.then((data) =>
				setEvents(data.items.map(({ id, name }) => ({ id, name }))),
			)
			.catch(() => {
				// The Program chip then shows "Nincs választható program".
			});
		return () => controller.abort();
	}, []);
	return events;
}

/** Eldöntetlen duplikátumpárok száma a bannerhez; `null`, amíg nem ismert. */
function useDuplicateCount() {
	const [count, setCount] = useState<number | null>(null);
	useEffect(() => {
		const controller = new AbortController();
		apiFetch<DuplicatesResponse>("/api/applicants/duplicates", {
			signal: controller.signal,
		})
			.then((data) => setCount(data.total))
			.catch(() => {
				// No banner when the count is unavailable.
			});
		return () => controller.abort();
	}, []);
	return [count, setCount] as const;
}

/** A szerveren már lekért első oldal, és a query, amire válaszol. */
export type InitialApplicants = { apiQuery: string; data: ApplicantsPage };

export function ApplicantsView({
	initial,
	years = [],
}: {
	initial?: InitialApplicants;
	/** A „Program éve” választó évei (a szerver a DB-ből adja). */
	years?: number[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchKey = searchParams.toString();
	const state = useMemo(
		() => parseListState(new URLSearchParams(searchKey)),
		[searchKey],
	);

	const applicants = useApplicants(toApiQuery(state).toString(), initial);
	const events = useEventOptions();
	const [duplicateCount, setDuplicateCount] = useDuplicateCount();
	const [duplicatesOpen, setDuplicatesOpen] = useState(false);
	const [duplicatesRun, setDuplicatesRun] = useState(0);
	const [columnSettings, setColumnSettings] = useColumnSettings(
		APPLICANT_COLUMN_CONFIG,
	);
	const csvExport = useCsvExport();

	const [emailListOpen, setEmailListOpen] = useState(false);
	// Bumped on every open so the dialog remounts with fresh state.
	const [emailListRun, setEmailListRun] = useState(0);

	const navigate = useCallback(
		(next: ListState) => {
			const query = toSearchParams(next).toString();
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router],
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
