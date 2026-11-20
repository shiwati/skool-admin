import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import {
	formatCount,
	formatDate,
	formatDateTime,
} from "@/lib/applicants/format";
import { eventReportHref } from "@/lib/events/links";
import {
	filterReports,
	listReports,
	parseReportTab,
	type ReportTab,
} from "@/lib/reports/list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Riportok" };

const TAB_LABELS: Record<ReportTab, string> = {
	todo: "Teendő",
	done: "Kész",
	all: "Mind",
};

const tabClass =
	"-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none";

// Access is enforced by the (admin) layout.
export default async function ReportsPage({
	searchParams,
}: PageProps<"/reports">) {
	const tab = parseReportTab((await searchParams).tab);
	const { items, counts } = await listReports(new Date());
	const rows = filterReports(items, tab);

	return (
		<PageShell>
			<PageHeader
				eyebrow="Riportok"
				title="Program végi riportok"
				description="Lezárt programok záró riportjai · Google Docs"
			/>
			<nav aria-label="Riportok szűrése">
				<ul className="flex gap-1 border-b border-border-default">
					{(Object.keys(TAB_LABELS) as ReportTab[]).map((key) => (
						<li key={key}>
							<Link
								href={
									key === "todo"
										? "/reports"
										: `/reports?tab=${key}`
								}
								aria-current={tab === key ? "page" : undefined}
								className={cn(
									tabClass,
									tab === key
										? "border-ink text-text-primary"
										: "border-transparent text-text-secondary hover:text-text-primary",
								)}
							>
								{TAB_LABELS[key]}
								<span
									className={cn(
										"rounded-full px-2 font-mono text-[11px] leading-5",
										tab === key
											? "bg-ink text-white"
											: "bg-surface-subtle text-text-secondary",
									)}
								>
									{formatCount(counts[key])}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</nav>

			{rows.length === 0 ? (
				<p className="rounded-[14px] border border-border-default bg-white p-6 text-sm text-text-secondary">
					{tab === "todo"
						? "Minden lezárt programhoz készült már riport."
						: "Nincs megjeleníthető program."}
				</p>
			) : (
				<div className="overflow-x-auto rounded-[14px] border border-border-default bg-white shadow-card">
					<table className="w-full min-w-[720px] text-sm">
						<thead>
							<tr className="border-b border-border-default text-left text-text-tertiary">
								<th className="px-4 py-3 font-medium">
									Program
								</th>
								<th className="w-36 px-4 py-3 font-medium">
									Lezárva
								</th>
								<th className="w-40 px-4 py-3 font-medium">
									Riport állapota
								</th>
								<th className="w-56 px-4 py-3 font-medium">
									Utolsó generálás
								</th>
								<th className="w-48 px-4 py-3 text-right font-medium">
									Művelet
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-default">
							{rows.map((row) => (
								<tr key={row.eventId}>
									<td className="px-4 py-3">
										<span className="font-medium">
											{row.name}
										</span>
										{row.companyName && (
											<span className="block text-text-tertiary">
												{row.companyName}
											</span>
										)}
									</td>
									<td className="px-4 py-3 font-mono text-text-secondary">
										{formatDate(row.to)}
									</td>
									<td className="px-4 py-3">
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
									</td>
									<td className="px-4 py-3 text-text-secondary">
										{row.lastGeneratedAt
											? `${row.lastGeneratedBy ?? "—"} · ${formatDateTime(row.lastGeneratedAt)}`
											: "—"}
									</td>
									<td className="px-4 py-3 text-right">
										<Link
											href={eventReportHref(row.eventId)}
											className={cn(
												"inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
												row.documents > 0
													? "border-border-strong bg-white hover:bg-surface-subtle"
													: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
											)}
										>
											{row.documents > 0
												? "Riport megnyitása"
												: "Riport készítése"}
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</PageShell>
	);
}
