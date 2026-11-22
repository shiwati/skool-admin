import { ChevronLeft, ChevronRight, MessageSquare, Star } from "lucide-react";
import { EmptyState } from "@/components/list/empty-state";
import Link from "next/link";
import type { ReactNode } from "react";
import { KpiCard } from "@/components/events/overview/kpi-card";
import { LinkRow } from "@/components/link-row";
import { Card } from "@/components/ui/card";
import { programColorClass } from "@/lib/applicants/format";
import {
	feedbackNote,
	feedbackSearch,
	formatRate,
	formatScore,
	respondentLabel,
	type FeedbackUrlState,
} from "@/lib/feedback/format";
import type { FeedbackListItem, FeedbackListPage } from "@/lib/feedback/list";
import { RECOMMEND_LABELS } from "@/lib/feedback/questions";
import { pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { FeedbackDrawer } from "./feedback-drawer";

import { FeedbackToolbar } from "./feedback-toolbar";
import { RecommendBadge } from "./recommend-badge";
import { EMPTY, formatCount, formatDate } from "@/lib/format";

const pageLink =
	"flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-mono text-xs";
const headCell =
	"px-3 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase";

function Pager({
	data,
	href,
}: {
	data: FeedbackListPage;
	href: (page: number) => string;
}) {
	const { total, page, pageSize } = data;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="flex flex-wrap items-center gap-3 border-t border-border-default px-4 py-3">
			<span className="flex-1 text-xs text-text-secondary">
				{formatCount(from)}–{formatCount(to)} / {formatCount(total)}{" "}
				kitöltés
			</span>
			{pageCount > 1 && (
				<nav aria-label="Lapozás" className="flex items-center gap-1">
					{page > 1 && (
						<Link
							href={href(page - 1)}
							aria-label="Előző oldal"
							className={cn(pageLink, "hover:bg-surface-subtle")}
						>
							<ChevronLeft
								aria-hidden="true"
								className="size-4"
							/>
						</Link>
					)}
					{pageNumbers(page, pageCount).map((p, i) =>
						p === null ? (
							<span
								key={`gap-${i}`}
								aria-hidden="true"
								className="px-1 text-xs text-text-tertiary"
							>
								…
							</span>
						) : (
							<Link
								key={p}
								href={href(p)}
								aria-label={`${p}. oldal`}
								aria-current={p === page ? "page" : undefined}
								className={cn(
									pageLink,
									p === page
										? "bg-ink text-white"
										: "hover:bg-surface-subtle",
								)}
							>
								{p}
							</Link>
						),
					)}
					{page < pageCount && (
						<Link
							href={href(page + 1)}
							aria-label="Következő oldal"
							className={cn(pageLink, "hover:bg-surface-subtle")}
						>
							<ChevronRight
								aria-hidden="true"
								className="size-4"
							/>
						</Link>
					)}
				</nav>
			)}
		</div>
	);
}

function Row({
	item,
	href,
	showProgram,
}: {
	item: FeedbackListItem;
	href: string;
	showProgram: boolean;
}) {
	const note = feedbackNote(item.role, item.answers);
	return (
		<LinkRow
			href={href}
			scroll={false}
			className="hover:bg-surface-subtle/60"
		>
			<td className="px-3 py-3">
				<Link
					href={href}
					scroll={false}
					className="font-medium underline-offset-2 hover:underline"
				>
					{respondentLabel(item.role, item.answers)}
				</Link>
			</td>
			{showProgram && (
				<td className="px-3 py-3">
					<span className="flex min-w-0 items-center gap-2">
						<span
							aria-hidden="true"
							className={cn(
								"size-2 shrink-0 rounded-full",
								programColorClass(item.eventId),
							)}
						/>
						<span className="truncate">{item.eventName}</span>
					</span>
				</td>
			)}
			<td className="px-3 py-3 font-mono text-xs text-text-secondary">
				{item.submittedAt ? formatDate(item.submittedAt) : EMPTY}
			</td>
			<td className="px-3 py-3">
				<span className="inline-flex items-center gap-1">
					<Star
						aria-hidden="true"
						className="size-3.5 fill-warning-fg text-warning-fg"
					/>
					<span className="font-medium">
						{formatScore(item.overallScore)}
					</span>
					<span className="text-xs text-text-tertiary">/ 5</span>
				</span>
			</td>
			<td className="px-3 py-3">
				{item.recommend ? (
					<RecommendBadge value={item.recommend}>
						{RECOMMEND_LABELS[item.recommend]}
					</RecommendBadge>
				) : (
					<span className="text-text-tertiary">{EMPTY}</span>
				)}
			</td>
			<td className="truncate px-3 py-3 text-text-secondary" title={note}>
				{note || <span className="text-text-tertiary">{EMPTY}</span>}
			</td>
		</LinkRow>
	);
}

/** Mobil kártya a táblázatsor helyett (terv: 07.1 M); a részletekre visz. */
function FeedbackCard({
	item,
	href,
	showProgram,
}: {
	item: FeedbackListItem;
	href: string;
	showProgram: boolean;
}) {
	const note = feedbackNote(item.role, item.answers);
	return (
		<Link
			href={href}
			scroll={false}
			className="flex min-h-11 flex-col gap-2 px-4 py-3.5 hover:bg-surface-subtle/60"
		>
			<span className="flex items-baseline gap-2">
				<span className="min-w-0 flex-1 truncate font-medium">
					{respondentLabel(item.role, item.answers)}
				</span>
				<span className="inline-flex shrink-0 items-center gap-1">
					<Star
						aria-hidden="true"
						className="size-3.5 fill-warning-fg text-warning-fg"
					/>
					<span className="font-medium">
						{formatScore(item.overallScore)}
					</span>
					<span className="sr-only"> / 5</span>
				</span>
			</span>
			<span className="flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
				{showProgram && (
					<>
						<span
							aria-hidden="true"
							className={cn(
								"size-2 shrink-0 rounded-full",
								programColorClass(item.eventId),
							)}
						/>
						<span className="truncate">{item.eventName}</span>
						<span className="text-text-tertiary">·</span>
					</>
				)}
				<span className="shrink-0 font-mono text-xs text-text-tertiary">
					{item.submittedAt ? formatDate(item.submittedAt) : EMPTY}
				</span>
			</span>
			{note && (
				<span className="line-clamp-3 text-sm text-text-secondary">
					„{note}”
				</span>
			)}
			{item.recommend && (
				<span className="self-start">
					<RecommendBadge value={item.recommend}>
						{RECOMMEND_LABELS[item.recommend]}
					</RecommendBadge>
				</span>
			)}
		</Link>
	);
}

function FeedbackEmptyState({ filtered }: { filtered: boolean }) {
	return (
		<EmptyState
			className="px-6 py-12"
			icon={MessageSquare}
			tone="neutral"
			title={filtered ? "Nincs találat" : "Még nincs visszajelzés"}
			description={
				filtered
					? "Módosíts a keresésen vagy a szűrőkön."
					: "A program szerkesztésénél add meg a visszajelző sheeteket, majd szinkronizálj."
			}
		/>
	);
}

/**
 * A Visszajelzések lista (terv: F01) a részletek fiókkal (F02). Szerveren
 * renderel; a szűrők és a megnyitott elem az URL-ben vannak, `basePath`
 * alatt (globális lista vagy egy program füle).
 */
export function FeedbackView({
	data,
	state,
	basePath,
	events,
	periods,
	openItem,
	header,
}: {
	data: FeedbackListPage;
	state: FeedbackUrlState;
	basePath: string;
	/** Programszűrő opciói; `undefined` a program saját fülén. */
	events?: { id: string; name: string }[];
	/** Időszakszűrő opciói; `undefined` a program saját fülén. */
	periods?: { key: string; label: string }[];
	openItem: FeedbackListItem | null;
	header?: ReactNode;
}) {
	const { stats, items } = data;
	const showProgram = events !== undefined;
	const listState = { ...state, page: data.page };
	const href = (patch: FeedbackUrlState) =>
		`${basePath}${feedbackSearch({ ...listState, ...patch })}`;

	const index = openItem ? items.findIndex((i) => i.id === openItem.id) : -1;
	const prev = index > 0 ? items[index - 1] : undefined;
	const next =
		index >= 0 && index < items.length - 1 ? items[index + 1] : undefined;
	const filtered = Boolean(
		state.q || state.role || state.eventId || state.period,
	);

	return (
		<>
			{header}
			<dl className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
				<KpiCard
					label="Átlagos értékelés"
					value={formatScore(stats.averageScore)}
				>
					{stats.averageScore !== null && (
						<span className="text-sm text-text-tertiary">/ 5</span>
					)}
				</KpiCard>
				<KpiCard label="Kitöltések" value={formatCount(stats.count)} />
				<KpiCard
					label="Kitöltési arány"
					value={formatRate(stats.responseRate)}
				>
					<span className="text-sm text-text-tertiary">
						{stats.responseRate === null
							? "nincs „Részt vett” jelentkező"
							: "a résztvevőkből"}
					</span>
				</KpiCard>
				<KpiCard
					label="Ajánlaná másnak"
					value={formatRate(stats.recommendRate)}
				/>
			</dl>

			<FeedbackToolbar state={state} events={events} periods={periods} />

			<Card className="overflow-hidden">
				{items.length === 0 ? (
					<FeedbackEmptyState filtered={filtered} />
				) : (
					<>
						{/* Mobile (< md): cards instead of the table (board 07.1 M). */}
						<ul
							aria-label="Visszajelzések"
							className="divide-y divide-border-default md:hidden"
						>
							{items.map((item) => (
								<li key={item.id}>
									<FeedbackCard
										item={item}
										href={href({ open: item.id })}
										showProgram={showProgram}
									/>
								</li>
							))}
						</ul>
						<div
							data-testid="feedback-table-frame"
							className="relative hidden overflow-x-auto md:block"
						>
							<table className="w-full min-w-[880px] table-fixed border-collapse text-sm">
								<caption className="sr-only">
									Visszajelzések
								</caption>
								<thead className="bg-surface-subtle text-left">
									<tr className="border-b border-border-default">
										<th
											scope="col"
											className={cn(headCell, "w-56")}
										>
											Kitöltő
										</th>
										{showProgram && (
											<th
												scope="col"
												className={cn(headCell, "w-52")}
											>
												Program
											</th>
										)}
										<th
											scope="col"
											className={cn(headCell, "w-28")}
										>
											Kitöltve
										</th>
										<th
											scope="col"
											className={cn(headCell, "w-32")}
										>
											Összértékelés
										</th>
										<th
											scope="col"
											className={cn(headCell, "w-24")}
										>
											Ajánlaná
										</th>
										<th scope="col" className={headCell}>
											Megjegyzés
										</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<Row
											key={item.id}
											item={item}
											href={href({ open: item.id })}
											showProgram={showProgram}
										/>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
				<Pager
					data={data}
					href={(page) => href({ page, open: undefined })}
				/>
			</Card>

			<FeedbackDrawer
				item={openItem}
				closeHref={href({ open: undefined })}
				prevHref={prev && href({ open: prev.id })}
				nextHref={next && href({ open: next.id })}
			/>
		</>
	);
}
