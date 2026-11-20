"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/applicants/format";
import type { PhaseCounts } from "@/lib/events/list";
import {
	clearEventFilters,
	hasActiveEventFilters,
	parseEventListState,
	toEventSearchParams,
	updateEventListState,
	type EventListState,
} from "@/lib/events/list-params";
import {
	EventDeleteDialog,
	type EventDeleteTarget,
} from "./event-delete-dialog";
import { EventsTable, type EventListItem } from "./events-table";
import { EventsTabs } from "./events-tabs";
import { EventsToolbar } from "./events-toolbar";

export function EventsView({
	items,
	total,
	counts,
	now,
}: {
	items: EventListItem[];
	/** Az aktuális fül és szűrők szerinti találatok száma. */
	total: number;
	counts: PhaseCounts;
	/** A szerver által használt „most” (ISO), hogy a státusz egyezzen. */
	now: string;
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
	const [deleteTarget, setDeleteTarget] = useState<EventDeleteTarget | null>(
		null,
	);

	function navigate(next: EventListState) {
		const query = toEventSearchParams(next).toString();
		startTransition(() => {
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		});
	}
	const change = (patch: Partial<EventListState>) =>
		navigate(updateEventListState(state, patch));
	const clearFilters = () => navigate(clearEventFilters(state));

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
					<Button asChild>
						<Link href="/events/new">
							<Plus aria-hidden="true" />
							Új program
						</Link>
					</Button>
				}
			/>
			<EventsTabs
				tab={state.tab}
				counts={counts}
				onChange={(tab) => change({ tab })}
			/>
			<EventsToolbar
				filters={state}
				onChange={change}
				onClearAll={clearFilters}
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
