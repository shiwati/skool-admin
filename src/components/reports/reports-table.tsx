import Link from "next/link";
import { EMPTY, formatDate, formatDateTime } from "@/lib/applicants/format";
import { eventReportHref } from "@/lib/events/links";
import type { ReportListItem } from "@/lib/reports/list";
import { cn } from "@/lib/utils";

/**
 * A Riportok lista: tablettől táblázat, mobilon (< md) kártyák, mint a
 * Jelentkezők oldalon. Mindkettő ugyanazokat a cellákat használja.
 */
export function ReportsTable({ rows }: { rows: ReportListItem[] }) {
	return (
		<div className="overflow-hidden rounded-[14px] border border-border-default bg-white shadow-card">
			{/* Mobile: one card per program. */}
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
				<table className="w-full min-w-[720px] text-sm">
					<caption className="sr-only">Riportok</caption>
					<thead>
						<tr className="border-b border-border-default text-left text-text-tertiary">
							<th scope="col" className="px-4 py-3 font-medium">
								Program
							</th>
							<th
								scope="col"
								className="w-36 px-4 py-3 font-medium"
							>
								Lezárva
							</th>
							<th
								scope="col"
								className="w-40 px-4 py-3 font-medium"
							>
								Riport állapota
							</th>
							<th
								scope="col"
								className="w-56 px-4 py-3 font-medium"
							>
								Utolsó generálás
							</th>
							<th
								scope="col"
								className="w-48 px-4 py-3 text-right font-medium"
							>
								Művelet
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border-default">
						{rows.map((row) => (
							<tr key={row.eventId}>
								<td className="px-4 py-3">
									<ProgramName row={row} />
								</td>
								<td className="px-4 py-3 font-mono text-text-secondary">
									{formatDate(row.to)}
								</td>
								<td className="px-4 py-3">
									<ReportStatus row={row} />
								</td>
								<td className="px-4 py-3 text-text-secondary">
									{lastGenerated(row)}
								</td>
								<td className="px-4 py-3 text-right">
									<ReportAction row={row} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/** Mobil kártya: név és partner, címkézett sorok, alul teljes szélességű gomb. */
function ReportCard({ row }: { row: ReportListItem }) {
	return (
		<div className="flex flex-col gap-3 px-4 py-3.5">
			<ProgramName row={row} />
			<dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
				<dt className="text-text-tertiary">Lezárva</dt>
				<dd className="font-mono text-xs leading-5 text-text-secondary">
					{formatDate(row.to)}
				</dd>
				<dt className="text-text-tertiary">Riport állapota</dt>
				<dd>
					<ReportStatus row={row} />
				</dd>
				<dt className="text-text-tertiary">Utolsó generálás</dt>
				<dd className="break-words text-text-secondary">
					{lastGenerated(row)}
				</dd>
			</dl>
			<ReportAction row={row} className="h-11 w-full justify-center" />
		</div>
	);
}

function ProgramName({ row }: { row: ReportListItem }) {
	return (
		<div className="min-w-0">
			<span className="font-medium">{row.name}</span>
			{row.companyName && (
				<span className="block text-text-tertiary">
					{row.companyName}
				</span>
			)}
		</div>
	);
}

function ReportStatus({ row }: { row: ReportListItem }) {
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap",
				row.documents > 0
					? "bg-info-bg text-info-fg"
					: "bg-surface-subtle text-text-secondary",
			)}
		>
			{row.documents > 0
				? `Docs kész (${row.documents})`
				: "Nincs elkészítve"}
		</span>
	);
}

function lastGenerated(row: ReportListItem): string {
	return row.lastGeneratedAt
		? `${row.lastGeneratedBy ?? EMPTY} · ${formatDateTime(row.lastGeneratedAt)}`
		: EMPTY;
}

function ReportAction({
	row,
	className,
}: {
	row: ReportListItem;
	className?: string;
}) {
	return (
		<Link
			href={eventReportHref(row.eventId)}
			className={cn(
				"inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
				row.documents > 0
					? "border-border-strong bg-white hover:bg-surface-subtle"
					: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
				className,
			)}
		>
			{row.documents > 0 ? "Riport megnyitása" : "Riport készítése"}
		</Link>
	);
}
