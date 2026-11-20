import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** Egy mutató a KPI-sorban; a `<dl>` szülőt a hívó adja. */
export function KpiCard({
	label,
	value,
	children,
}: {
	label: string;
	value: ReactNode;
	children?: ReactNode;
}) {
	return (
		<Card className="flex flex-col gap-1 p-3.5 md:gap-2 md:p-5">
			<dt className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{label}
			</dt>
			<dd className="flex flex-wrap items-baseline gap-2">
				<span className="text-2xl leading-[30px] font-bold md:text-3xl md:leading-9">
					{value}
				</span>
				{children}
			</dd>
		</Card>
	);
}
