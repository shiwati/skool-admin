import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shortLabel, type NavItem } from "./nav-items";

/**
 * Ikon + rövid felirat (tablet ikonsáv, mobil alsó navigáció). Az
 * akadálymentes név mindig a teljes felirat; `href` nélkül letiltott.
 */
export function CompactNavItem({
	item,
	active,
	className,
	pillClassName,
	onNavigate,
	badge,
}: {
	item: NavItem;
	active: boolean;
	className?: string;
	pillClassName?: string;
	onNavigate?: () => void;
	badge?: ReactNode;
}) {
	const Icon = item.icon;
	const short = shortLabel(item);
	const content = (
		<>
			<span
				className={cn(
					"relative flex h-8 w-13 items-center justify-center rounded-full [&_svg]:size-5",
					active && "bg-ink text-white",
					pillClassName,
				)}
			>
				<Icon aria-hidden="true" />
				{badge}
			</span>
			<span aria-hidden={short !== item.label || undefined}>{short}</span>
		</>
	);
	const base = cn(
		"flex min-h-11 flex-col items-center gap-1 text-[10px] leading-3 font-medium",
		className,
	);
	const name = short !== item.label ? item.label : undefined;

	if (!item.href) {
		return (
			<span
				role="link"
				aria-disabled="true"
				aria-label={item.label}
				title="Hamarosan"
				className={cn(base, "cursor-not-allowed opacity-45")}
			>
				{content}
			</span>
		);
	}
	return (
		<Link
			href={item.href}
			aria-label={name}
			aria-current={active ? "page" : undefined}
			onClick={onNavigate}
			className={cn(
				base,
				"rounded-lg focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
				active && "font-semibold",
			)}
		>
			{content}
		</Link>
	);
}
