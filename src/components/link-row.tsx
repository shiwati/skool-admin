"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { openRowHref } from "@/lib/row-nav";
import { cn } from "@/lib/utils";

/**
 * Kattintható táblázatsor szerveren renderelt táblázatokhoz: az egész sor a
 * `href`-re visz (a soron belüli linkek, gombok a saját céljukra; Ctrl/⌘ +
 * kattintás új lapon). Billentyűzettel a sor linkjei érhetők el.
 */
export function LinkRow({
	href,
	scroll = true,
	className,
	children,
}: {
	href: string;
	/** `false`: ne görgessen az oldal tetejére (pl. fiók megnyitása). */
	scroll?: boolean;
	className?: string;
	children: ReactNode;
}) {
	const router = useRouter();
	return (
		<tr
			onClick={(event) =>
				openRowHref(event, href, (h) => router.push(h, { scroll }))
			}
			className={cn(
				"cursor-pointer border-b border-border-default last:border-0",
				className,
			)}
		>
			{children}
		</tr>
	);
}
