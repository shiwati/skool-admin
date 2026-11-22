import { Card } from "@/components/ui/card";
import type { CountRow } from "@/lib/dashboard/compute";
import type { CompanyRow } from "@/lib/dashboard/insights";
import { formatCount } from "@/lib/format";
import { BarList } from "./bar-list";
import { SectionHeader } from "./kpi-card";

/** „Hogyan hallottak rólunk” – a jelentkezési űrlap szabad szövegéből csoportosítva. */
export function ChannelsCard({
	rows,
	subtitle,
}: {
	rows: CountRow[];
	subtitle: string;
}) {
	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Hogyan hallottak rólunk"
				subtitle={subtitle}
			/>
			{rows.length === 0 ? (
				<p className="py-8 text-center text-sm text-text-secondary">
					Még nincs adat.
				</p>
			) : (
				<BarList rows={rows} showShare />
			)}
		</Card>
	);
}

/** A partnercégek a szervezett programjaik száma szerint; sok cégnél görgethető. */
export function PartnersCard({ rows }: { rows: CompanyRow[] }) {
	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Legaktívabb partnerek"
				subtitle="A cégek a szervezett programok száma szerint"
			/>
			{rows.length === 0 ? (
				<p className="py-4 text-center text-sm text-text-secondary">
					Még nincs céghez rendelt program.
				</p>
			) : (
				<ol className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
					{rows.map((row, index) => (
						<li
							key={row.name}
							className="flex items-center gap-3 text-sm"
						>
							<span
								aria-hidden="true"
								className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-subtle font-mono text-xs"
							>
								{index + 1}
							</span>
							<span
								className="min-w-0 flex-1 truncate"
								title={row.name}
							>
								{row.name}
							</span>
							<span className="shrink-0 font-mono text-xs text-text-secondary">
								{formatCount(row.programs)} program ·{" "}
								{formatCount(row.applications)} jelentkező
							</span>
						</li>
					))}
				</ol>
			)}
		</Card>
	);
}
