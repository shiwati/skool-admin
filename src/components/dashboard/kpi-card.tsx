import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { StatBadge, type Tone } from "./stat-badge";

export function KpiCard({
	label,
	value,
	badge,
	tone = "neutral",
	note,
}: {
	label: string;
	value: string;
	badge?: ReactNode;
	tone?: Tone;
	note: ReactNode;
}) {
	return (
		<Card className="flex flex-col gap-2 p-5">
			<h2 className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{label}
			</h2>
			<p className="text-[32px] leading-10 font-bold tracking-tight">
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
