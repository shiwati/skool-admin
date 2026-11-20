"use client";

import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { ColumnPicker } from "@/components/column-picker";
import { Button } from "@/components/ui/button";
import { useColumnSettings } from "@/hooks/use-column-settings";
import { csvFilename, useCsvExport } from "@/hooks/use-csv-export";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { formatCount } from "@/lib/applicants/format";
import { visibleColumns } from "@/lib/column-settings";
import { EVENT_COLUMN_CONFIG } from "@/lib/events/column-settings";
import { buildEventsCsv } from "@/lib/events/export";
import type { PhaseCounts } from "@/lib/events/list";
import {
	clearEventFilters,
	hasActiveEventFilters,
	parseEventListState,
	toEventSearchParams,
	toEventsApiQuery,
	updateEventListState,
	type EventListState,
} from "@/lib/events/list-params";
import {
	EventDeleteDialog,
	type EventDeleteTarget,
} from "./event-delete-dialog";
import { EVENT_COLUMNS } from "./event-columns";
import { EventsTable, type EventListItem } from "./events-table";
import { EventsTabs } from "./events-tabs";
import { EventsToolbar } from "./events-toolbar";

export function EventsView({
	items,
	total,
	counts,
	now,
	years = [],
}: {
	items: EventListItem[];
	/** Az aktuális fül és szűrők szerinti találatok száma. */
	total: number;
	counts: PhaseCounts;
	/** A szerver által használt „most” (ISO), hogy a státusz egyezzen. */
	now: string;
	/** A „Program éve” választó évei (a szerver a DB-ből adja). */
	years?: number[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchKey = searchParams.toString();
	const state = useMemo(
		() => parseEventListState(new URLSearchParams(searchKey)),
		[searchKey],
	);
	const [pending, startTransition] = useTransition();
	const [columnSettings, setColumnSettings] =
		useColumnSettings(EVENT_COLUMN_CONFIG);
	const csvExport = useCsvExport();
	const [deleteTarget, setDeleteTarget] = useState<EventDeleteTarget | null>(
		null,
	);

	function hrefFor(next: EventListState) {
		const query = toEventSearchParams(next).toString();
		return query ? `${pathname}?${query}` : pathname;
	}
	function navigate(next: EventListState) {
		startTransition(() => {
			router.replace(hrefFor(next), { scroll: false });
		});
	}
	const change = (patch: Partial<EventListState>) =>
		navigate(updateEventListState(state, patch));
	const clearFilters = () => navigate(clearEventFilters(state));

	// A szűrt találatok mindegyike (az aktuális fül is szűrésnek számít).
	function exportCsv() {
		void csvExport.run(csvFilename("programok"), async (signal) => {
			const all = await fetchAllPages<EventListItem>(
				(page, pageSize) =>
					`/api/events?${toEventsApiQuery(state, { page, pageSize })}`,
				signal,
			);
			return { csv: buildEventsCsv(all), rows: all.length };
		});
	}

	return (
		<>
			<PageHeader
				eyebrow="Programok"
				title="Programok"
				description={
					hasActiveEventFilters(state) &&
					`Találatok száma: ${formatCount(total)} db`
				}
				actions={
					<>
						<Button
							variant="surface"
							onClick={exportCsv}
							disabled={csvExport.exporting}
						>
							<Download aria-hidden="true" />
							{csvExport.exporting
								? "Exportálás…"
								: "Exportálás CSV-be"}
						</Button>
						{/* Mobile: the floating button below takes this role. */}
						<Button asChild className="hidden md:inline-flex">
							<Link href="/events/new">
								<Plus aria-hidden="true" />
								Új program
							</Link>
						</Button>
					</>
				}
			/>
			{/* Mobile (board 05.1 M): floating "Új program" above the bottom nav. */}
			<Button
				asChild
				className="fixed right-4 bottom-[calc(var(--shell-bottom)+1rem)] z-30 h-13 rounded-full px-5 shadow-overlay md:hidden"
			>
				<Link href="/events/new" data-testid="new-event-fab">
					<Plus aria-hidden="true" />
					Új program
				</Link>
			</Button>
			<EventsTabs
				tab={state.tab}
				counts={counts}
				hrefFor={(tab) => hrefFor(updateEventListState(state, { tab }))}
				onChange={(tab) => change({ tab })}
			/>
			<EventsToolbar
				filters={state}
				years={years}
				onChange={change}
				onClearAll={clearFilters}
				trailing={
					<ColumnPicker
						config={EVENT_COLUMN_CONFIG}
						columns={EVENT_COLUMNS}
						settings={columnSettings}
						onChange={setColumnSettings}
					/>
				}
				// Same settings: the mobile cards follow them too.
				mobileTrailing={
					<ColumnPicker
						compact
						config={EVENT_COLUMN_CONFIG}
						columns={EVENT_COLUMNS}
						settings={columnSettings}
						onChange={setColumnSettings}
					/>
				}
			/>
			<EventsTable
				items={items}
				total={total}
				tab={state.tab}
				sort={state.sort}
				order={state.order}
				page={state.page}
				pageSize={state.pageSize}
				now={new Date(now)}
				columns={visibleColumns(columnSettings)}
				pending={pending}
				filtersActive={hasActiveEventFilters(state)}
				onSort={(sort, order) => change({ sort, order })}
				onPage={(page) => change({ page })}
				onPageSize={(pageSize) => change({ pageSize })}
				onClearFilters={clearFilters}
				onDelete={setDeleteTarget}
			/>
			<EventDeleteDialog
				key={deleteTarget?.id}
				target={deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				onDeleted={() => {
					setDeleteTarget(null);
					router.refresh();
				}}
			/>
		</>
	);
}
