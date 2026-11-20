"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApplicants } from "@/hooks/use-applicants";
import { useColumnSettings } from "@/hooks/use-column-settings";
import { apiFetch } from "@/lib/api/client";
import { visibleColumns } from "@/lib/applicants/column-settings";
import { buildEmailList, formatCount, fullName } from "@/lib/applicants/format";
import {
	clearFilters,
	hasActiveFilters,
	parseListState,
	resultKey,
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
import { copyText } from "@/lib/clipboard";
import { ApplicantsHeader } from "./applicants-header";
import { ApplicantsTable, type TableData } from "./applicants-table";
import { ApplicantsToolbar } from "./applicants-toolbar";
import { BulkActionBar } from "./bulk-action-bar";
import { ColumnPicker } from "./column-picker";
import { DeleteDialog, type DeleteTarget } from "./delete-dialog";
import { DuplicateBanner } from "./duplicate-banner";
import { DuplicateReviewDialog } from "./duplicate-review-dialog";
import { EmailListDialog } from "./email-list-dialog";

const NO_SELECTION: ReadonlySet<string> = new Set();

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

export function ApplicantsView({ initial }: { initial?: InitialApplicants }) {
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
	const [columnSettings, setColumnSettings] = useColumnSettings();

	// The selection belongs to one result set: any change to page, sort,
	// search or filters starts a fresh, empty selection.
	const currentKey = resultKey(state);
	const [selection, setSelection] = useState<{
		key: string;
		ids: Set<string>;
	}>({ key: currentKey, ids: new Set() });
	const selected =
		selection.key === currentKey ? selection.ids : NO_SELECTION;

	const [emailListOpen, setEmailListOpen] = useState(false);
	// Bumped on every open so the dialog remounts with fresh state.
	const [emailListRun, setEmailListRun] = useState(0);
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
	const [deleteRun, setDeleteRun] = useState(0);

	function openDelete(target: DeleteTarget) {
		setDeleteRun((n) => n + 1);
		setDeleteTarget(target);
	}

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

	const items: ApplicantListItem[] =
		applicants.status === "success" ? applicants.data.items : [];
	const tableData: TableData =
		applicants.status === "success"
			? {
					status: "success",
					items: applicants.data.items,
					total: applicants.data.total,
				}
			: { status: applicants.status };

	function setSelected(ids: Set<string>) {
		setSelection({ key: currentKey, ids });
	}

	async function copySelectedEmails() {
		const { text, count } = buildEmailList(
			items
				.filter((item) => selected.has(item.id))
				.map((item) => item.email),
		);
		if (count === 0) {
			toast.info("A kijelölt jelentkezőknek nincs e-mail címe.");
			return;
		}
		if (await copyText(text)) {
			toast.success(
				`${formatCount(count)} e-mail cím a vágólapra másolva`,
			);
		} else {
			toast.error("Nem sikerült a vágólapra másolni.");
		}
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
				onChange={change}
				onClearAll={() => navigate(clearFilters(state))}
				trailing={
					<ColumnPicker
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
				selected={selected}
				filtersActive={hasActiveFilters(state)}
				onSort={(sort, order) => change({ sort, order })}
				onPage={(page) => change({ page })}
				onPageSize={(pageSize) => change({ pageSize })}
				onToggleRow={(id) => {
					const next = new Set(selected);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					setSelected(next);
				}}
				onToggleAll={(ids, select) => {
					const next = new Set(selected);
					for (const id of ids) {
						if (select) next.add(id);
						else next.delete(id);
					}
					setSelected(next);
				}}
				onClearFilters={() => navigate(clearFilters(state))}
				onReload={applicants.reload}
			/>
			<BulkActionBar
				count={selected.size}
				onCopyEmails={() => void copySelectedEmails()}
				onDelete={() => {
					const ids = [...selected];
					const only =
						ids.length === 1
							? items.find((i) => i.id === ids[0])
							: undefined;
					openDelete({
						ids,
						name: only ? fullName(only) : null,
					});
				}}
				onClear={() => setSelected(new Set())}
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
			<DeleteDialog
				key={`delete-${deleteRun}`}
				target={deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				onDeleted={() => {
					setDeleteTarget(null);
					setSelected(new Set());
					applicants.reload();
				}}
			/>
		</>
	);
}
