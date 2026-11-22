import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import { ReportsFilter } from "@/components/reports/reports-filter";
import {
	filterReports,
	listReports,
	parseReportTab,
	type ReportTab,
} from "@/lib/reports/list";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Riportok" };

const TAB_LABELS: Record<ReportTab, string> = {
	todo: "Teendő",
	done: "Kész",
	all: "Mind",
};

const tabClass =
	"-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap";

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
				<ReportsFilter rows={rows} />
			)}
		</PageShell>
	);
}
