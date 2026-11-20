"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { openRowHref } from "@/lib/row-nav";

/**
 * Kattintható táblázatsor: az egész sor a részletek fiókot nyitja (a sor
 * görgetése nélkül). Billentyűzettel az első cella linkje érhető el.
 */
export function FeedbackRow({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	const router = useRouter();
	return (
		<tr
			onClick={(event) =>
				openRowHref(event, href, (h) =>
					router.push(h, { scroll: false }),
				)
			}
			className="cursor-pointer border-b border-border-default last:border-0 hover:bg-surface-subtle/60"
		>
			{children}
		</tr>
	);
}
