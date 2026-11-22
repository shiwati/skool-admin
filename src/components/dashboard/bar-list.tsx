import { MISSING_LABEL, share, type CountRow } from "@/lib/dashboard/compute";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Vízszintes sávok címkével és darabszámmal (település, csatorna…). */
export function BarList({
	rows,
	unit = "jelentkezés",
	showShare = false,
}: {
	rows: CountRow[];
	/** Képernyőolvasónak: mit számol a szám (százalékos nézetben a „fő” látszik). */
	unit?: string;
	/**
	 * A darabszám mellé százalékos arány is kerül. A „Nincs adat” sor nem
	 * számít bele a 100%-ba, és nem kap százalékot.
	 */
	showShare?: boolean;
}) {
	const max = Math.max(1, ...rows.map((r) => r.count));
	const known = rows
		.filter((r) => r.label !== MISSING_LABEL)
		.reduce((sum, r) => sum + r.count, 0);
	return (
		<ul className="flex flex-col gap-2">
			{rows.map((row) => {
				const percent =
					showShare && row.label !== MISSING_LABEL && known > 0
						? ` · ${share(row.count, known)}%`
						: "";
				return (
					<li
						key={row.label}
						className="flex items-center gap-3 text-sm"
					>
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
						<span
							className={cn(
								"text-right font-mono text-xs text-text-secondary",
								showShare ? "w-28" : "w-10",
							)}
						>
							{`${formatCount(row.count)}${showShare ? " fő" : ""}${percent}`}
							{!showShare && (
								<span className="sr-only"> {unit}</span>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
