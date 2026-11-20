import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ageFromBirthYear,
	applicantInitials,
	fullName,
	isOver16,
	TAG_BADGE_CLASSES,
} from "@/lib/applicants/format";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";
import { applicantHref, cardValue, COLUMNS } from "./columns";
import { LOCKED_COLUMN, type ColumnId } from "@/lib/applicants/column-settings";
import type { TableData } from "./applicants-table";
import { ListEmptyState, ListErrorState } from "./list-state";

const SKELETON_CARDS = 5;

const badge =
	"inline-flex items-center gap-1.5 rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap";

/**
 * A fejléc a rögzített „Név / e-mail” oszlop; alatta minden más látható
 * oszlop egy címkézett sor, az oszlopválasztó sorrendjében.
 */
function ApplicantCard({
	item,
	now,
	columns,
}: {
	item: ApplicantListItem;
	now: Date;
	columns: ColumnId[];
}) {
	const lines = columns.filter((id) => id !== LOCKED_COLUMN);
	return (
		<Link
			href={applicantHref(item.id)}
			className="flex min-h-11 gap-3 px-4 py-3.5 hover:bg-canvas"
		>
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold"
			>
				{applicantInitials(item)}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="truncate font-medium">
						{fullName(item)}
					</span>
					{isOver16(ageFromBirthYear(item.birthYear, now)) && (
						<span
							className={cn(
								badge,
								"px-2",
								TAG_BADGE_CLASSES.over16,
							)}
						>
							16+
						</span>
					)}
				</span>
				{item.email && (
					<span className="truncate text-sm text-text-tertiary">
						{item.email}
					</span>
				)}
				{lines.length > 0 && (
					<dl className="mt-1.5 flex flex-col gap-1.5 text-sm">
						{lines.map((id) => (
							<div
								key={id}
								className="grid grid-cols-[112px_minmax(0,1fr)] items-baseline gap-x-3"
							>
								<dt className="text-text-tertiary">
									{COLUMNS[id].subLabel
										? `${COLUMNS[id].label} / ${COLUMNS[id].subLabel.toLowerCase()}`
										: COLUMNS[id].label}
								</dt>
								<dd className="min-w-0 break-words">
									{cardValue(id, item, now)}
								</dd>
							</div>
						))}
					</dl>
				)}
			</span>
		</Link>
	);
}

/**
 * Mobil (< 768 px) kártyalista a táblázat helyett (terv: 03.1 M). Nincs
 * kijelölés; a kártya az adatlapra visz. A lapozó a közös `Pager`.
 */
export function ApplicantCardList({
	data,
	now,
	columns,
	filtersActive,
	onClearFilters,
	onReload,
	className,
}: {
	data: TableData;
	now: Date;
	/** A látható oszlopok sorrendben (`visibleColumns`); a kártyasorokat adják. */
	columns: ColumnId[];
	filtersActive: boolean;
	onClearFilters: () => void;
	onReload: () => void;
	className?: string;
}) {
	if (data.status === "error") {
		return (
			<div className={cn("px-4 py-10", className)}>
				<ListErrorState onReload={onReload} />
			</div>
		);
	}
	if (data.status === "success" && data.items.length === 0) {
		return (
			<div className={cn("px-4 py-10", className)}>
				<ListEmptyState
					filtersActive={filtersActive}
					onClearFilters={onClearFilters}
				/>
			</div>
		);
	}
	return (
		<ul
			aria-label="Jelentkezők"
			aria-busy={data.status === "loading" || undefined}
			className={cn("divide-y divide-border-default", className)}
		>
			{data.status === "loading"
				? Array.from({ length: SKELETON_CARDS }, (_, i) => (
						<li
							key={i}
							data-testid="skeleton-card"
							className="flex gap-3 px-4 py-3.5"
						>
							<Skeleton className="size-10 rounded-full" />
							<span className="flex flex-1 flex-col gap-2">
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-3.5 w-3/4" />
							</span>
						</li>
					))
				: data.items.map((item) => (
						<li key={item.id}>
							<ApplicantCard
								item={item}
								now={now}
								columns={columns}
							/>
						</li>
					))}
		</ul>
	);
}
