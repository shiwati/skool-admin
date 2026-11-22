import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Egy lista oldalának betöltési állapota, ahogy a táblák kapják. */
export type ListData<T> =
	| { status: "loading" }
	| { status: "error" }
	| { status: "success"; items: T[]; total: number };

/** Betöltés közbeni helykitöltő sorok. */
export function SkeletonRows({
	columns,
	rows = 6,
}: {
	columns: number;
	rows?: number;
}) {
	return Array.from({ length: rows }, (_, i) => (
		<tr
			key={i}
			className="border-b border-border-default last:border-0"
			data-testid="skeleton-row"
		>
			{Array.from({ length: columns }, (_, j) => (
				<td key={j} className="px-3 py-3">
					<Skeleton className="h-3.5 w-3/4" />
				</td>
			))}
		</tr>
	));
}

/** A tábla teljes szélességű üzenetsora (üres vagy hibaállapot). */
export function TableMessageRow({
	colSpan,
	className,
	children,
}: {
	colSpan: number;
	className?: string;
	children: ReactNode;
}) {
	return (
		<tr>
			<td colSpan={colSpan} className={cn("px-6 py-12", className)}>
				{children}
			</td>
		</tr>
	);
}
