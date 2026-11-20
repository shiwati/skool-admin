import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

/**
 * Az utolsó elem az aktuális oldal, link nélkül. `mobileBack` esetén mobilon
 * (`md` alatt) a teljes útvonal helyett csak egy „‹ {szülő}” visszalink látszik.
 */
export function Breadcrumb({
	items,
	mobileBack = false,
}: {
	items: BreadcrumbItem[];
	mobileBack?: boolean;
}) {
	const parent = mobileBack
		? items.slice(0, -1).findLast((item) => item.href)
		: undefined;

	return (
		<nav aria-label="Morzsamenü" className="text-xs text-text-secondary">
			{parent?.href && (
				<Link
					href={parent.href}
					className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm font-medium text-text-primary md:hidden"
				>
					<ChevronLeft aria-hidden="true" className="size-4" />
					{parent.label}
				</Link>
			)}
			<ol
				className={cn(
					"flex flex-wrap items-center gap-1.5",
					parent && "hidden md:flex",
				)}
			>
				{items.map((item, index) => {
					const last = index === items.length - 1;
					return (
						<li
							key={item.label}
							className="flex min-w-0 items-center gap-1.5"
						>
							{item.href && !last ? (
								<Link
									href={item.href}
									className="text-info-fg underline underline-offset-2 hover:text-ink hover:no-underline"
								>
									{item.label}
								</Link>
							) : (
								<span
									aria-current={last ? "page" : undefined}
									className="truncate"
								>
									{item.label}
								</span>
							)}
							{!last && (
								<ChevronRight
									aria-hidden="true"
									className="size-3 text-text-tertiary"
								/>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
