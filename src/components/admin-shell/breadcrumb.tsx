import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

/** Az utolsó elem az aktuális oldal, link nélkül. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
	return (
		<nav aria-label="Morzsamenü" className="text-xs text-text-secondary">
			<ol className="flex items-center gap-1.5">
				{items.map((item, index) => {
					const last = index === items.length - 1;
					return (
						<li
							key={item.label}
							className="flex items-center gap-1.5"
						>
							{item.href && !last ? (
								<Link
									href={item.href}
									className="text-info-fg underline underline-offset-2 hover:text-ink hover:no-underline"
								>
									{item.label}
								</Link>
							) : (
								<span aria-current={last ? "page" : undefined}>
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
