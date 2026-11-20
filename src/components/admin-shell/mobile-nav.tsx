"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CompactNavItem } from "./compact-nav-item";
import { isActive, navItems } from "./nav-items";
import { UserMenu, type ShellUser } from "./user-menu";

/** Mobil (< 768 px) felső sáv: logó, „admin” jelvény, felhasználói menü. */
export function MobileTopBar({
	user,
	className,
}: {
	user: ShellUser;
	className?: string;
}) {
	return (
		<header
			className={cn(
				// Fixed (not sticky): always attached to the top of the screen.
				"fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-1 bg-sky pt-[env(safe-area-inset-top)] pr-3 pl-4",
				className,
			)}
		>
			<Link
				href="/"
				className="flex items-center gap-2"
				aria-label="Áttekintés"
			>
				<Image
					src="/brand/skool-logo.png"
					alt="Skool"
					width={80}
					height={26}
					className="h-[26px] w-auto"
					priority
				/>
				<span className="rounded-full bg-ink px-[7px] py-px font-mono text-[9px] leading-3 font-semibold text-white uppercase">
					admin
				</span>
			</Link>
			<span className="flex-1" />
			<UserMenu user={user} compact />
		</header>
	);
}

/**
 * Mobil alsó navigáció (fix, 72 px + safe area), a „Mobil alsó navigáció”
 * terv szerint.
 */
export function MobileTabBar({ className }: { className?: string }) {
	const pathname = usePathname();

	return (
		<nav
			aria-label="Főmenü"
			className={cn(
				"fixed inset-x-0 bottom-0 z-40 flex items-start border-t border-border-default bg-white px-1 pt-2 pb-[max(env(safe-area-inset-bottom),8px)]",
				className,
			)}
		>
			{navItems.map((item) => (
				<CompactNavItem
					key={item.label}
					item={item}
					active={isActive(item.href, pathname)}
					className="flex-1 text-text-secondary aria-[current=page]:text-text-primary"
				/>
			))}
		</nav>
	);
}
