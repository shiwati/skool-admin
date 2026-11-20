import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatBadge, type Tone } from "./stat-badge";

export function KpiCard({
	label,
	value,
	badge,
	tone = "neutral",
	note,
	wide = false,
}: {
	label: string;
	value: string;
	badge?: ReactNode;
	tone?: Tone;
	note: ReactNode;
	/** Mobilon (2 oszlopos rácsban) a teljes szélességet foglalja. */
	wide?: boolean;
}) {
	return (
		<Card
			className={cn(
				"flex flex-col gap-1 p-3.5 md:gap-2 md:p-5",
				wide && "col-span-2 md:col-span-1",
			)}
		>
			<h2 className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{label}
			</h2>
			<p className="text-2xl leading-[30px] font-bold tracking-tight md:text-[32px] md:leading-10">
				{value}
			</p>
			<div className="flex flex-wrap items-center gap-2">
				{badge !== undefined && (
					<StatBadge tone={tone}>{badge}</StatBadge>
				)}
				<span className="text-xs text-text-tertiary">{note}</span>
			</div>
		</Card>
	);
}

export function SectionHeader({
	title,
	subtitle,
	actions,
}: {
	title: string;
	subtitle?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="flex flex-col gap-0.5">
				<h2 className="text-base leading-6 font-semibold">{title}</h2>
				{subtitle && (
					<p className="text-xs text-text-tertiary">{subtitle}</p>
				)}
			</div>
			{actions}
		</div>
	);
}

/** KPI-rács: mobilon 2 oszlop (a `wide` kártya teljes széles), tablettől 3. */
export function KpiGrid({ children }: { children: ReactNode }) {
	return (
		<div
			data-testid="kpi-grid"
			className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4"
		>
			{children}
		</div>
	);
}
