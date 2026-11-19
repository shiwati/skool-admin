"use client";

import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceLine,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Info } from "lucide-react";
import { ChartContainer } from "@/components/charts/chart-container";
import { Card } from "@/components/ui/card";
import { formatCount } from "@/lib/applicants/format";
import { formatRatio, type MonthlyRatio } from "@/lib/dashboard/compute";
import { SectionHeader } from "./kpi-card";

const SKY = "#a6c7e7";
const INK = "#0f0f0f";
const GRID = "#e2e7ee";
const AXIS_TEXT = "#6b7480";

/** Az első és az utolsó adatos hónap összevetése a chart alatti sávhoz. */
export function trendSummary(points: MonthlyRatio[]): string {
	const known = points.filter((p) => p.ratio !== null);
	if (known.length === 0)
		return "Az elmúlt 6 hónapban nem indult férőhellyel meghirdetett program.";
	const first = known[0];
	const last = known[known.length - 1];
	if (known.length === 1)
		return `Csak ${first.label} hónapban indult program: ${formatRatio(first.ratio!)}.`;
	const diff = last.ratio! - first.ratio!;
	const trend =
		Math.abs(diff) < 0.05
			? "nagyjából változatlan"
			: diff > 0
				? "nő"
				: "csökken";
	return `A túljelentkezés ${trend}: ${first.label} ${formatRatio(first.ratio!)} → ${last.label} ${formatRatio(last.ratio!)}.`;
}

function TrendTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: { payload: MonthlyRatio }[];
}) {
	const point = payload?.[0]?.payload;
	if (!active || !point) return null;
	return (
		<div className="rounded-lg border border-border-default bg-white px-3 py-2 text-xs shadow-overlay">
			<p className="font-semibold">{point.label}</p>
			{point.ratio === null ? (
				<p className="text-text-secondary">Nem indult program</p>
			) : (
				<>
					<p>{formatRatio(point.ratio)}</p>
					<p className="text-text-secondary">
						{formatCount(point.applications)} jelentkezés /{" "}
						{formatCount(point.capacity)} férőhely
					</p>
				</>
			)}
		</div>
	);
}

export function OversubscriptionTrend({ points }: { points: MonthlyRatio[] }) {
	const summary = trendSummary(points);

	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Túljelentkezés alakulása"
				subtitle="Jelentkezők / férőhely az adott hónapban induló programokon · elmúlt 6 hónap"
			/>
			<ChartContainer
				label={`Túljelentkezés havonta. ${summary}`}
				className="h-52"
			>
				<ComposedChart
					data={points}
					margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
				>
					<CartesianGrid stroke={GRID} vertical={false} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={{ stroke: "#c9d2dd" }}
						tick={{ fill: AXIS_TEXT, fontSize: 11 }}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						allowDecimals
						domain={[0, "auto"]}
						tickFormatter={(v: number) => formatRatio(v)}
						tick={{ fill: AXIS_TEXT, fontSize: 11 }}
					/>
					<ReferenceLine
						y={1}
						stroke="#c9d2dd"
						strokeDasharray="4 4"
					/>
					<Tooltip content={<TrendTooltip />} />
					<Area
						type="linear"
						dataKey="ratio"
						fill={SKY}
						fillOpacity={0.35}
						stroke="none"
						connectNulls
						isAnimationActive={false}
					/>
					<Line
						type="linear"
						dataKey="ratio"
						stroke={INK}
						strokeWidth={2}
						dot={{ r: 3, fill: INK }}
						connectNulls
						isAnimationActive={false}
					/>
				</ComposedChart>
			</ChartContainer>
			<p className="flex items-start gap-2 rounded-lg bg-info-bg px-3 py-2.5 text-xs text-info-fg">
				<Info aria-hidden="true" className="mt-px size-4 shrink-0" />
				<span>{summary} A szaggatott vonal az 1× (telt ház).</span>
			</p>
		</Card>
	);
}
