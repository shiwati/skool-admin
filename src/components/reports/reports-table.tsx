import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkRow } from "@/components/link-row";
import { Card } from "@/components/ui/card";
import {
	EMPTY,
	formatDate,
	formatDateTime,
	programColorClass,
} from "@/lib/applicants/format";
import { eventHref, eventReportHref } from "@/lib/events/links";
import type { ReportListItem } from "@/lib/reports/list";
import { cn } from "@/lib/utils";

const headClass =
	"px-3 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase";

/**
 * A Riportok lista, a Programok táblázat mintájára: tablettől táblázat,
 * mobilon (< md) kártyák. Mindkettő ugyanazokat a cellákat használja.
 */
export function ReportsTable({ rows }: { rows: ReportListItem[] }) {
	return (
		<Card className="overflow-hidden">
			{/* Mobile: one card per program (like the program cards). */}
			<ul
				aria-label="Riportok"
				className="divide-y divide-border-default md:hidden"
			>
				{rows.map((row) => (
					<li key={row.eventId}>
						<ReportCard row={row} />
					</li>
				))}
			</ul>
			<div
				data-testid="reports-table-frame"
				className="relative hidden overflow-x-auto md:block"
			>
				<table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
					<caption className="sr-only">Riportok</caption>
					<thead className="bg-surface-subtle text-left">
						<tr className="border-b border-border-default">
							<th scope="col" className={headClass}>
								Program
							</th>
							<th
								scope="col"
								className={cn(headClass, "w-[120px]")}
							>
								Lezárva
							</th>
							<th
								scope="col"
								className={cn(headClass, "w-[170px]")}
							>
								Riport állapota
							</th>
							<th
								scope="col"
								className={cn(headClass, "w-[190px]")}
							>
								Utolsó generálás
							</th>
							<th scope="col" className="w-[170px] px-3 py-2.5">
								<span className="sr-only">Művelet</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<LinkRow
								key={row.eventId}
								href={eventReportHref(row.eventId)}
								className="hover:bg-canvas"
							>
								<td className="px-3 py-2.5 align-middle">
									<ProgramName row={row} />
								</td>
								<td className="px-3 py-2.5 align-middle">
									<ClosedDate row={row} />
								</td>
								<td className="px-3 py-2.5 align-middle">
									<ReportStatus row={row} />
								</td>
								<td className="px-3 py-2.5 align-middle">
									<LastGenerated row={row} />
								</td>
								<td className="px-3 py-2.5 text-right align-middle">
									<ReportAction row={row} />
								</td>
							</LinkRow>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}

/** Mobil kártya (mint a programkártya): név, címkézett sorok, alul gomb. */
function ReportCard({ row }: { row: ReportListItem }) {
	return (
		<div className="flex flex-col gap-2.5 px-4 py-3.5">
			<div className="flex items-start gap-2">
				<span
					aria-hidden="true"
					className={cn(
						"mt-1.5 size-2 shrink-0 rounded-full",
						programColorClass(row.eventId),
					)}
				/>
				<ProgramName row={row} />
			</div>
			<dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
				<dt className="text-text-tertiary">Lezárva</dt>
				<dd>
					<ClosedDate row={row} />
				</dd>
				<dt className="text-text-tertiary">Riport</dt>
				<dd>
					<ReportStatus row={row} />
				</dd>
				<dt className="text-text-tertiary">Generálva</dt>
				<dd className="min-w-0">
					<LastGenerated row={row} />
				</dd>
			</dl>
			<ReportAction row={row} className="h-11 w-full justify-center" />
		</div>
	);
}

function ProgramName({ row }: { row: ReportListItem }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<Link
				href={eventHref(row.eventId)}
				className="truncate font-medium hover:underline"
			>
				{row.name}
			</Link>
			{row.companyName && (
				<span className="truncate text-xs text-text-tertiary">
					{row.companyName}
				</span>
			)}
		</div>
	);
}

function ClosedDate({ row }: { row: ReportListItem }) {
	return (
		<span className="font-mono text-xs leading-5">
			{formatDate(row.to)}
		</span>
	);
}

function ReportStatus({ row }: { row: ReportListItem }) {
	const ready = row.documents > 0;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 text-xs leading-5 font-medium whitespace-nowrap",
				ready
					? "bg-info-bg text-info-fg"
					: "bg-surface-subtle text-text-secondary",
			)}
		>
			<span
				aria-hidden="true"
				className="size-1.5 rounded-full bg-current"
			/>
			{ready ? `Docs kész (${row.documents})` : "Nincs elkészítve"}
		</span>
	);
}

function LastGenerated({ row }: { row: ReportListItem }) {
	if (!row.lastGeneratedAt) {
		return <span className="text-text-tertiary">{EMPTY}</span>;
	}
	return (
		<div className="min-w-0 text-xs">
			<div className="truncate">{row.lastGeneratedBy ?? EMPTY}</div>
			<div className="truncate font-mono text-text-tertiary">
				{formatDateTime(row.lastGeneratedAt)}
			</div>
		</div>
	);
}

function ReportAction({
	row,
	className,
}: {
	row: ReportListItem;
	className?: string;
}) {
	const ready = row.documents > 0;
	return (
		<Button
			asChild
			size="sm"
			variant={ready ? "surface" : "default"}
			className={className}
		>
			<Link href={eventReportHref(row.eventId)}>
				{ready ? "Riport megnyitása" : "Riport készítése"}
			</Link>
		</Button>
	);
}
