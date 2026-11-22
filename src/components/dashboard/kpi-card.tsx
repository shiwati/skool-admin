import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatBadge, type Tone } from "./stat-badge";

export function KpiCard({
	label,
	value,
	icon,
	badge,
	tone = "neutral",
	note,
	wide = false,
	href,
	hrefLabel,
}: {
	label: string;
	value: string;
	/** Az érték előtt álló jel (pl. csillag az értékelésnél). */
	icon?: ReactNode;
	badge?: ReactNode;
	tone?: Tone;
	note: ReactNode;
	/** Mobilon (2 oszlopos rácsban) a teljes szélességet foglalja. */
	wide?: boolean;
	/** Ha van, a kártya hivatkozás: nyíl jelzi, hover/fókusz kiemeli. */
	href?: string;
	/** A hivatkozás képernyőolvasós szövege (pl. „Értékelések megnyitása”). */
	hrefLabel?: string;
}) {
	const card = (
		<Card
			className={cn(
				"flex flex-col gap-1 p-3.5 md:gap-2 md:p-5",
				href
					? "h-full transition-colors group-hover:border-ink group-focus-visible:border-ink"
					: wide && "col-span-2 md:col-span-1",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
					{label}
				</h2>
				{href && (
					<ArrowUpRight
						aria-hidden="true"
						className="size-4 shrink-0 text-text-tertiary transition-colors group-hover:text-text-primary"
					/>
				)}
			</div>
			<p className="flex items-center gap-2 text-2xl leading-[30px] font-bold tracking-tight md:text-[32px] md:leading-10">
				{icon}
				{value}
			</p>
			<div className="flex flex-wrap items-center gap-2">
				{badge !== undefined && (
					<StatBadge tone={tone}>{badge}</StatBadge>
				)}
				<span className="min-w-0 text-xs text-text-tertiary">
					{note}
				</span>
			</div>
		</Card>
	);

	if (!href) return card;
	return (
		<Link
			href={href}
			aria-label={hrefLabel ? `${label}: ${hrefLabel}` : undefined}
			className={cn(
				"group block rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
				wide && "col-span-2 md:col-span-1",
			)}
		>
			{card}
		</Link>
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

/**
 * KPI-rács: mobilon 2 oszlop (a `wide` kártya teljes széles), tablettől 3;
 * `columns={5}` esetén nagy képernyőn 5 oszlop.
 */
export function KpiGrid({
	children,
	columns = 3,
}: {
	children: ReactNode;
	columns?: 3 | 5;
}) {
	return (
		<div
			data-testid="kpi-grid"
			className={cn(
				"grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4",
				columns === 5 && "xl:grid-cols-5",
			)}
		>
			{children}
		</div>
	);
}
