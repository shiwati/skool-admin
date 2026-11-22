import { ratioBadgeClass } from "@/lib/events/format";
import { formatRatio } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Túljelentkezés-címke (jelentkezők / kapacitás); a szín az aránytól függ. Mindenhol ezt használd. */
export function RatioBadge({
	ratio,
	className,
	...props
}: { ratio: number } & React.ComponentProps<"span">) {
	return (
		<span
			// inline-block: flex-elemen kívül (pl. táblázatcellában) is fix, 20 px magas doboz.
			className={cn(
				"inline-block rounded-full px-2 font-mono text-xs leading-5 font-medium",
				ratioBadgeClass(ratio),
				className,
			)}
			{...props}
		>
			{formatRatio(ratio)}
		</span>
	);
}
