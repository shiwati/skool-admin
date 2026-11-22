"use client";

import { Copy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePagedQuery } from "@/hooks/use-paged-query";
import { ApiError, apiFetch, jsonInit } from "@/lib/api/client";
import { STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import {
	acceptedAfter,
	type EventApplicationsPage,
	type InitialApplications,
} from "@/lib/events/applications";
import {
	DEFAULT_APPLICATIONS_VIEW as DEFAULT_VIEW,
	parseApplicationsParams,
	toApplicationsApiQuery,
	updateApplicationsView,
	type ApplicationsView,
} from "@/lib/events/applications-params";
import { eventApplicantsHref } from "@/lib/events/links";
import type { StatusCounts } from "@/lib/events/list";
import {
	EmailListDialog,
	type EmailPageFetcher,
} from "@/components/applicants/email-list-dialog";
import { ApplicationsTable, type ApplicationsData } from "./applications-table";
import { BulkStatusBar } from "./bulk-status-bar";
import { SheetSyncButton } from "./sheet-sync-button";
import { StatusFilterChips } from "./status-filter-chips";
import { formatCount } from "@/lib/format";

const SORT_LABELS: Record<ApplicationsView["sort"], string> = {
	receivedAt: "jelentkezés ideje",
	name: "név",
	age: "kor",
	status: "státusz",
};

function sortDescription({ sort, order }: ApplicationsView) {
	const direction =
		sort === "receivedAt"
			? order === "asc"
				? "a régebbiek elöl"
				: "az újabbak elöl"
			: order === "asc"
				? "növekvő"
				: "csökkenő";
	return `${SORT_LABELS[sort]}, ${direction}`;
}

export function ApplicationsSection({
	eventId,
	capacity,
	counts,
	applicationSheetUrl = null,
	initial,
}: {
	eventId: string;
	capacity: number;
	counts: StatusCounts;
	/** Ha meg van adva, a szakasz fejlécében szinkronizálás gomb is van. */
	applicationSheetUrl?: string | null;
	/**
	 * A szerveren az URL nézetével lekért oldal. `router.refresh()` után új
	 * példány érkezik, ami lecseréli a listát (kliensoldali kérés nélkül).
	 */
	initial?: InitialApplications;
}) {
	const router = useRouter();
	const [refreshing, startRefresh] = useTransition();
	const searchParams = useSearchParams();
	const searchKey = searchParams.toString();
	const view = useMemo(
		() => parseApplicationsParams(new URLSearchParams(searchKey)),
		[searchKey],
	);
	// Selection is tagged with the result it was made on, so any filter, sort
	// or page change drops it without an effect.
	const [selection, setSelection] = useState<{
		key: string;
		ids: ReadonlySet<string>;
	}>({ key: "", ids: new Set() });
	const [pending, setPending] = useState(false);
	const [confirm, setConfirm] = useState<{
		ids: string[];
		status: ApplicationStatus;
		accepted: number;
	} | null>(null);

	const base = `/api/events/${eventId}/applicants?`;
	// Fresh server data after `router.refresh()` replaces the list; if the
	// server could not load it, the hook falls back to a client request.
	const { result, requestKey, reload } = usePagedQuery<EventApplicationsPage>(
		base + toApplicationsApiQuery(view).toString(),
		initial && { url: base + initial.apiQuery, data: initial.data },
	);
	const data: ApplicationsData =
		result.status === "success"
			? {
					status: "success",
					items: result.data.items,
					total: result.data.total,
				}
			: result;
	const items = data.status === "success" ? data.items : [];
	const selected =
		selection.key === requestKey ? selection.ids : new Set<string>();
	const selectedItems = items.filter((item) => selected.has(item.id));

	const [emailListOpen, setEmailListOpen] = useState(false);
	const [emailListRun, setEmailListRun] = useState(0);
	const selectedEmails = selectedItems.map((item) => item.applicant.email);
	const selectedKey = selectedEmails.join("\n");
	// Kijelölés esetén csak a kijelöltek címe, különben az aktuális
	// státuszszűrés összes találata (minden oldalról).
	const emailPages = useMemo<EmailPageFetcher>(() => {
		if (selectedKey) {
			const emails = selectedKey.split("\n");
			return async () => ({ emails, total: emails.length });
		}
		const status = view.status;
		return async (page, pageSize, signal) => {
			const data = await apiFetch<EventApplicationsPage>(
				`/api/events/${eventId}/applicants?${toApplicationsApiQuery(
					{ ...DEFAULT_VIEW, status },
					{ page, pageSize },
				)}`,
				{ signal },
			);
			return {
				emails: data.items.map((item) => item.applicant.email),
				total: data.total,
			};
		};
	}, [eventId, view.status, selectedKey]);

	// Native history API: Next syncs `useSearchParams` without re-rendering
	// the page on the server, so only this component fetches the new view.
	function change(patch: Partial<ApplicationsView>) {
		window.history.replaceState(
			null,
			"",
			eventApplicantsHref(eventId, updateApplicationsView(view, patch)),
		);
	}

	// The server reloads the open view (and the counts) in one go.
	function refresh() {
		startRefresh(() => router.refresh());
	}

	function select(ids: ReadonlySet<string>) {
		setSelection({ key: requestKey, ids });
	}

	async function applyStatus(ids: string[], status: ApplicationStatus) {
		setPending(true);
		try {
			const result = await apiFetch<{ updated: number; skipped: number }>(
				`/api/events/${eventId}/applicants/status`,
				jsonInit("POST", { ids, status }),
			);
			toast.success(
				`${formatCount(result.updated)} jelentkezés státusza: ${STATUS_LABELS[status]}`,
			);
			select(new Set());
			refresh();
		} catch (error) {
			if (!(error instanceof ApiError && error.status === 401))
				toast.error("A státusz módosítása nem sikerült. Próbáld újra.");
		} finally {
			setPending(false);
		}
	}

	function requestStatus(
		targets: { id: string; status: ApplicationStatus }[],
		status: ApplicationStatus,
	) {
		const ids = targets.map((t) => t.id);
		const accepted = acceptedAfter(counts.ACCEPTED, targets, status);
		if (status === "ACCEPTED" && capacity > 0 && accepted > capacity) {
			setConfirm({ ids, status, accepted });
			return;
		}
		void applyStatus(ids, status);
	}

	return (
		<section
			aria-labelledby="applications-heading"
			className="flex flex-col gap-3"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="applications-heading" className="text-lg font-semibold">
					Jelentkezések
				</h2>
				<div className="flex flex-wrap gap-2">
					{applicationSheetUrl && (
						// Its `router.refresh()` brings the reloaded list.
						<SheetSyncButton eventId={eventId} />
					)}
					<Button
						variant="surface"
						onClick={() => {
							setEmailListRun((n) => n + 1);
							setEmailListOpen(true);
						}}
					>
						<Copy aria-hidden="true" />
						E-mail lista
					</Button>
				</div>
			</div>
			<StatusFilterChips
				counts={counts}
				value={view.status}
				onChange={(status) => change({ status })}
			/>
			<p className="text-xs text-text-secondary">
				Rendezés: {sortDescription(view)}
				{(view.sort !== DEFAULT_VIEW.sort ||
					view.order !== DEFAULT_VIEW.order) && (
					<>
						{" · "}
						<button
							type="button"
							className="text-info-fg underline underline-offset-2 hover:text-ink"
							onClick={() =>
								change({
									sort: DEFAULT_VIEW.sort,
									order: DEFAULT_VIEW.order,
								})
							}
						>
							Alapsorrend
						</button>
					</>
				)}
			</p>
			<ApplicationsTable
				data={data}
				selected={selected}
				sort={view.sort}
				order={view.order}
				page={view.page}
				pageSize={view.pageSize}
				filtersActive={view.status !== null}
				statusPending={pending || refreshing}
				onChangeStatus={(item, status) => requestStatus([item], status)}
				onSort={(sort, order) => change({ sort, order })}
				onPage={(page) => change({ page })}
				onPageSize={(pageSize) => change({ pageSize })}
				onToggleRow={(id, checked) => {
					const next = new Set(selected);
					if (checked) next.add(id);
					else next.delete(id);
					select(next);
				}}
				onToggleAll={(ids, checked) => {
					const next = new Set(selected);
					for (const id of ids) {
						if (checked) next.add(id);
						else next.delete(id);
					}
					select(next);
				}}
				onClearFilters={() => change({ status: null })}
				onReload={reload}
			/>
			<BulkStatusBar
				count={selected.size}
				pending={pending}
				onSetStatus={(status) => requestStatus(selectedItems, status)}
				onClear={() => select(new Set())}
			/>
			<EmailListDialog
				key={`email-${emailListRun}`}
				open={emailListOpen}
				onOpenChange={setEmailListOpen}
				fetchPage={emailPages}
				description={
					selectedEmails.length > 0
						? "A kijelölt jelentkezők e-mail címe, vesszővel elválasztva."
						: undefined
				}
			/>
			<AlertDialog
				open={confirm !== null}
				onOpenChange={(open) => !open && setConfirm(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Túlléped a kapacitást?
						</AlertDialogTitle>
						<AlertDialogDescription>
							A művelet után {formatCount(confirm?.accepted ?? 0)}{" "}
							elfogadott jelentkező lenne, a program kapacitása{" "}
							{formatCount(capacity)}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Mégse</AlertDialogCancel>
						<Button
							onClick={() => {
								const pendingChange = confirm;
								setConfirm(null);
								if (pendingChange)
									void applyStatus(
										pendingChange.ids,
										pendingChange.status,
									);
							}}
						>
							Elfogadás mégis
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
