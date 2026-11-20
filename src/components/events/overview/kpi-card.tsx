import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** Egy mutató a KPI-sorban; a `<dl>` szülőt a hívó adja. */
export function KpiCard({
	label,
	value,
	asideLabel,
	asideValue,
	children,
}: {
	label: string;
	value: ReactNode;
	/** A címmel egy sorban, jobbra igazítva (jobb felső cella). */
	asideLabel?: ReactNode;
	/** A számmal egy sorban, jobbra igazítva (jobb alsó cella). */
	asideValue?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<Card className="grid grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1 p-3.5 md:gap-y-2 md:p-5">
			<dt className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{label}
			</dt>
			<dd className="text-right font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{asideLabel}
			</dd>
			<dd className="flex flex-wrap items-baseline gap-2">
				<span className="text-2xl leading-[30px] font-bold md:text-3xl md:leading-9">
					{value}
				</span>
				{children}
			</dd>
			<dd className="flex justify-end">{asideValue}</dd>
		</Card>
	);
}
