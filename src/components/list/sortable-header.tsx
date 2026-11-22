import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { SortOrder } from "@/lib/list-state";
import { cn } from "@/lib/utils";

/** A listatáblák fejléccellájának stílusa. */
export const TH_CLASS =
	"px-3 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase";

/** Az `aria-sort` értéke egy rendezhető oszlopra. */
export function ariaSort(active: boolean, order: SortOrder) {
	if (!active) return "none";
	return order === "asc" ? "ascending" : "descending";
}

/** Rendező gomb a fejlécben: felirat és az irányt jelző nyíl. */
export function SortButton({
	label,
	active,
	order,
	onClick,
	ariaLabel,
}: {
	label: ReactNode;
	active: boolean;
	order: SortOrder;
	onClick: () => void;
	ariaLabel?: string;
}) {
	const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			className="inline-flex items-center gap-1 uppercase hover:text-text-primary"
			onClick={onClick}
		>
			{label}
			<Icon
				aria-hidden="true"
				className={cn("size-3.5", !active && "opacity-50")}
			/>
		</button>
	);
}

/**
 * Rendezhető fejléccella. Kattintásra az aktív oszlop iránya megfordul, más
 * oszlop a saját kezdőirányával (`initialOrder`) indul.
 */
export function SortableTh<K extends string>({
	column,
	label,
	sort,
	order,
	initialOrder,
	onSort,
	ariaLabel,
	className,
	contentClassName,
	style,
	children,
}: {
	column: K;
	label: ReactNode;
	sort: K;
	order: SortOrder;
	initialOrder: (column: K) => SortOrder;
	onSort: (sort: K, order: SortOrder) => void;
	ariaLabel?: string;
	className?: string;
	/** A gombot (és a `children`-t) tartó oszlop osztálya, pl. behúzás. */
	contentClassName?: string;
	style?: CSSProperties;
	/** A gomb alá kerülő tartalom (pl. második sor felirat). */
	children?: ReactNode;
}) {
	const active = column === sort;
	const button = (
		<SortButton
			label={label}
			active={active}
			order={order}
			ariaLabel={ariaLabel}
			onClick={() =>
				onSort(
					column,
					active
						? order === "asc"
							? "desc"
							: "asc"
						: initialOrder(column),
				)
			}
		/>
	);
	return (
		<th
			scope="col"
			className={cn(TH_CLASS, className)}
			style={style}
			aria-sort={ariaSort(active, order)}
		>
			{children || contentClassName ? (
				<div
					className={cn(
						"flex flex-col items-start",
						contentClassName,
					)}
				>
					{button}
					{children}
				</div>
			) : (
				button
			)}
		</th>
	);
}
