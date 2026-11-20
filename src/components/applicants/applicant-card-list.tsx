import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ageFromBirthYear,
	applicantInitials,
	attendedCount,
	fullName,
	isOver16,
} from "@/lib/applicants/format";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";
import { applicantHref } from "./columns";
import type { TableData } from "./applicants-table";
import { ListEmptyState, ListErrorState } from "./list-state";

const SKELETON_CARDS = 5;

const badge =
	"inline-flex items-center gap-1.5 rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap";

/** „{életkor} év · {település}”, a hiányzó részek nélkül. */
export function ageAndPlace(item: ApplicantListItem, now: Date): string | null {
	const age = ageFromBirthYear(item.birthYear, now);
	const parts = [age === null ? null : `${age} év`, item.hometown].filter(
		Boolean,
	);
	return parts.length > 0 ? parts.join(" · ") : null;
}

function ApplicantCard({ item, now }: { item: ApplicantListItem; now: Date }) {
	const attended = attendedCount(item.applications);
	const meta = ageAndPlace(item, now);
	return (
		<Link
			href={applicantHref(item.id)}
			className="flex min-h-11 gap-3 px-4 py-3.5 hover:bg-canvas focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none focus-visible:ring-inset"
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
								"bg-info-bg px-2 text-info-fg",
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
				{meta && (
					<span className="text-sm text-text-secondary">{meta}</span>
				)}
				<span className="flex flex-wrap gap-1.5">
					{attended > 0 ? (
						<span className={cn(badge, "bg-sage")}>
							Korábban részt vett · {attended} program
						</span>
					) : (
						<span className={cn(badge, "bg-surface-subtle")}>
							Első jelentkezés
						</span>
					)}
					{item.newsletter && (
						<span
							className={cn(
								badge,
								"bg-success-bg text-success-fg",
							)}
						>
							Hírlevél
						</span>
					)}
				</span>
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
	filtersActive,
	onClearFilters,
	onReload,
	className,
}: {
	data: TableData;
	now: Date;
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
							<ApplicantCard item={item} now={now} />
						</li>
					))}
		</ul>
	);
}
