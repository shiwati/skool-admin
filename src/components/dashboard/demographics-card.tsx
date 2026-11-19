"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCount } from "@/lib/applicants/format";
import type { CountRow } from "@/lib/dashboard/compute";
import type { Demographics } from "@/lib/dashboard/load";
import { SectionHeader } from "./kpi-card";
import { Segmented } from "./segmented";

type View = "age" | "hometown";

const VIEWS = [
	{ value: "age", label: "Életkor" },
	{ value: "hometown", label: "Település" },
] as const satisfies readonly { value: View; label: string }[];

function AgeBars({ rows }: { rows: CountRow[] }) {
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
							éves: {row.count} jelentkezés
						</span>
					</span>
				</li>
			))}
		</ul>
	);
}

function HometownBars({ rows }: { rows: CountRow[] }) {
	const max = Math.max(1, ...rows.map((r) => r.count));
	return (
		<ul className="flex flex-col gap-2">
			{rows.map((row) => (
				<li key={row.label} className="flex items-center gap-3 text-sm">
					<span className="w-32 truncate" title={row.label}>
						{row.label}
					</span>
					<span
						aria-hidden="true"
						className="relative h-3 flex-1 rounded-full bg-surface-subtle"
					>
						<span
							className="absolute inset-y-0 left-0 rounded-full bg-sky"
							style={{ width: `${(row.count / max) * 100}%` }}
						/>
					</span>
					<span className="w-10 text-right font-mono text-xs text-text-secondary">
						{formatCount(row.count)}
						<span className="sr-only"> jelentkezés</span>
					</span>
				</li>
			))}
		</ul>
	);
}

export function DemographicsCard({
	data,
	periodLabel,
}: {
	data: Demographics;
	/** A fejlécben kiválasztott időszak neve. */
	periodLabel: string;
}) {
	const [view, setView] = useState<View>("age");

	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Demográfia"
				subtitle={`${periodLabel} · az időszakban induló programok jelentkezései · ${formatCount(data.total)} jelentkezés`}
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
					A kiválasztott időszakban még nincs jelentkezés.
				</p>
			) : view === "age" ? (
				<AgeBars rows={data.age} />
			) : (
				<HometownBars rows={data.hometown} />
			)}
			{data.total > 0 && (
				<p className="text-xs text-text-tertiary">
					{view === "age"
						? "Életkor = a program kezdő éve − születési év. Ha valaki több programra is jelentkezett, mindegyik jelentkezése beleszámít."
						: "A leggyakoribb települések; ha valaki több programra is jelentkezett, mindegyik jelentkezése beleszámít."}
				</p>
			)}
		</Card>
	);
}
