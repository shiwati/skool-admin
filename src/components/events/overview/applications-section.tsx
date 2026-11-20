"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { apiFetch, ApiError, isAbortError } from "@/lib/api/client";
import { formatCount, STATUS_LABELS } from "@/lib/applicants/format";
import type { PageSize } from "@/lib/applicants/list-params";
import type { ApplicationStatus } from "@/lib/applicants/types";
import {
	acceptedAfter,
	applicationsQueryString,
	type ApplicationsQuery,
	type EventApplicationsPage,
} from "@/lib/events/applications";
import type { StatusCounts } from "@/lib/events/list";
import { ApplicationsTable, type ApplicationsData } from "./applications-table";
import { BulkStatusBar } from "./bulk-status-bar";
import { StatusFilterChips } from "./status-filter-chips";

const DEFAULT_QUERY: ApplicationsQuery = {
	status: null,
	sort: "receivedAt",
	order: "asc",
	page: 1,
	pageSize: 25,
};

const SORT_LABELS: Record<ApplicationsQuery["sort"], string> = {
	receivedAt: "jelentkezés ideje",
	lastName: "név",
	birthYear: "kor",
	status: "státusz",
};

function sortDescription({ sort, order }: ApplicationsQuery) {
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

type Settled = { key: string; data: ApplicationsData };

export function ApplicationsSection({
	eventId,
	capacity,
	counts,
}: {
	eventId: string;
	capacity: number;
	counts: StatusCounts;
}) {
	const router = useRouter();
	const [query, setQuery] = useState<ApplicationsQuery>(DEFAULT_QUERY);
	const [attempt, setAttempt] = useState(0);
	const [settled, setSettled] = useState<Settled>();
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

	const queryString = applicationsQueryString(query);
	const requestKey = `${attempt}:${queryString}`;

	useEffect(() => {
		const controller = new AbortController();
		apiFetch<EventApplicationsPage>(
			`/api/events/${eventId}/applicants?${queryString}`,
			{ signal: controller.signal },
		)
			.then((page) => {
				if (controller.signal.aborted) return;
				setSettled({
					key: requestKey,
					data: {
						status: "success",
						items: page.items,
						total: page.total,
					},
				});
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted || isAbortError(error)) return;
				if (error instanceof ApiError && error.status === 401) return;
				setSettled({ key: requestKey, data: { status: "error" } });
			});
		return () => controller.abort();
	}, [eventId, queryString, requestKey]);

	const data: ApplicationsData =
		settled?.key === requestKey ? settled.data : { status: "loading" };
	const items = data.status === "success" ? data.items : [];
	const selected =
		selection.key === requestKey ? selection.ids : new Set<string>();
	const selectedItems = items.filter((item) => selected.has(item.id));

	function change(patch: Partial<ApplicationsQuery>) {
		setQuery((current) => ({ ...current, ...patch }));
	}

	function select(ids: ReadonlySet<string>) {
		setSelection({ key: requestKey, ids });
	}

	async function applyStatus(ids: string[], status: ApplicationStatus) {
		setPending(true);
		try {
			const result = await apiFetch<{ updated: number; skipped: number }>(
				`/api/events/${eventId}/applicants/status`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ ids, status }),
				},
			);
			toast.success(
				`${formatCount(result.updated)} jelentkezés státusza: ${STATUS_LABELS[status]}`,
			);
			select(new Set());
			setAttempt((n) => n + 1);
			router.refresh();
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
			<h2 id="applications-heading" className="text-lg font-semibold">
				Jelentkezések
			</h2>
			<StatusFilterChips
				counts={counts}
				value={query.status}
				onChange={(status) => change({ status, page: 1 })}
			/>
			<p className="text-xs text-text-secondary">
				Rendezés: {sortDescription(query)}
				{(query.sort !== DEFAULT_QUERY.sort ||
					query.order !== DEFAULT_QUERY.order) && (
					<>
						{" · "}
						<button
							type="button"
							className="text-info-fg underline underline-offset-2 hover:text-ink"
							onClick={() =>
								change({
									sort: DEFAULT_QUERY.sort,
									order: DEFAULT_QUERY.order,
									page: 1,
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
				sort={query.sort}
				order={query.order}
				page={query.page}
				pageSize={query.pageSize as PageSize}
				filtersActive={query.status !== null}
				statusPending={pending}
				onChangeStatus={(item, status) => requestStatus([item], status)}
				onSort={(sort, order) => change({ sort, order, page: 1 })}
				onPage={(page) => change({ page })}
				onPageSize={(pageSize) => change({ pageSize, page: 1 })}
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
				onClearFilters={() => change({ status: null, page: 1 })}
				onReload={() => setAttempt((n) => n + 1)}
			/>
			<BulkStatusBar
				count={selected.size}
				pending={pending}
				onSetStatus={(status) => requestStatus(selectedItems, status)}
				onClear={() => select(new Set())}
			/>
			<AlertDialog
				open={confirm !== null}
				onOpenChange={(open) => !open && setConfirm(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Túlléped a férőhelyet?
						</AlertDialogTitle>
						<AlertDialogDescription>
							A művelet után {formatCount(confirm?.accepted ?? 0)}{" "}
							elfogadott jelentkező lenne, a program férőhelye{" "}
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
