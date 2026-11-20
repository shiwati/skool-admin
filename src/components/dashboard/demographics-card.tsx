"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCount } from "@/lib/applicants/format";
import { share, type CountRow } from "@/lib/dashboard/compute";
import type { AgeFit, Demographics } from "@/lib/dashboard/insights";
import { BarList } from "./bar-list";
import { SectionHeader } from "./kpi-card";
import { Segmented } from "./segmented";

type View = "age" | "hometown";

const VIEWS = [
	{ value: "age", label: "Életkor" },
	{ value: "hometown", label: "Település" },
] as const satisfies readonly { value: View; label: string }[];

function AgeBars({ rows, unit }: { rows: CountRow[]; unit: string }) {
	const max = Math.max(1, ...rows.map((r) => r.count));
	return (
		<ul className="flex h-48 items-end justify-around gap-3">
			{rows.map((row) => (
				<li
					key={row.label}
					className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
				>
					<span className="font-mono text-xs text-text-secondary">
						{formatCount(row.count)}
					</span>
					<span
						aria-hidden="true"
						className="w-full max-w-10 rounded-t-md bg-sky"
						style={{
							height: `${(row.count / max) * 70}%`,
							minHeight: row.count > 0 ? 4 : 0,
						}}
					/>
					<span className="font-mono text-xs whitespace-nowrap text-text-secondary">
						{row.label}
						<span className="sr-only">
							{" "}
							éves: {row.count} {unit}
						</span>
					</span>
				</li>
			))}
		</ul>
	);
}

/** A program meghirdetett korosztályába esők aránya az ismert életkorúak közt. */
export function ageFitText(fit: AgeFit): string | null {
	if (fit.known === 0) return null;
	const { min, max } = fit.range;
	return `A meghirdetett ${min}–${max} éves korosztályba tartozik: ${share(fit.within, fit.known)}% · fiatalabb: ${share(fit.below, fit.known)}% · idősebb: ${share(fit.above, fit.known)}%`;
}

export function DemographicsCard({
	data,
	subtitle,
	emptyText = "Még nincs adat.",
	unit = "jelentkezés",
	ageNote = "Életkor = a program kezdő éve − születési év.",
	ageFit,
}: {
	data: Demographics;
	subtitle: string;
	emptyText?: string;
	/** Az életkor nézet lábjegyzete. */
	ageNote?: string;
	/** Mit számolnak a darabszámok: „jelentkezés” vagy „diák”. */
	unit?: string;
	/** Egyprogramos nézetben: a korosztály-illeszkedés az életkor nézet alatt. */
	ageFit?: AgeFit | null;
}) {
	const [view, setView] = useState<View>("age");
	const fitText = ageFit ? ageFitText(ageFit) : null;

	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Demográfia"
				subtitle={`${subtitle} · ${formatCount(data.total)} ${unit}`}
				actions={
					<Segmented
						label="Megoszlás"
						options={VIEWS}
						value={view}
						onChange={setView}
					/>
				}
			/>
			{data.total === 0 ? (
				<p className="py-8 text-center text-sm text-text-secondary">
					{emptyText}
				</p>
			) : view === "age" ? (
				<AgeBars rows={data.age} unit={unit} />
			) : (
				<BarList rows={data.hometown} unit={unit} />
			)}
			{data.total > 0 && view === "age" && fitText && (
				<p className="rounded-lg bg-info-bg px-3 py-2.5 text-xs text-info-fg">
					{fitText}
				</p>
			)}
			{data.total > 0 && (
				<p className="text-xs text-text-tertiary">
					{view === "age" ? ageNote : "A leggyakoribb települések."}
				</p>
			)}
		</Card>
	);
}
