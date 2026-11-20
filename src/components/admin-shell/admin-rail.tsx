"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CompactNavItem } from "./compact-nav-item";
import { isActive, railItems } from "./nav-items";

/** Tablet (768–1279 px) ikonos oldalsáv, a „Tablet oldalsáv” terv szerint. */
export function AdminRail({ className }: { className?: string }) {
	const pathname = usePathname();
	const active = (href?: string) => !!href && isActive(href, pathname);

	return (
		<nav
			aria-label="Főmenü"
			className={cn(
				"flex h-full w-20 flex-col items-center gap-3.5 bg-sky pt-[18px] pb-4 text-text-primary",
				className,
			)}
		>
			<Image
				src="/brand/skool-logo.png"
				alt="Skool"
				width={60}
				height={19}
				className="h-auto w-[60px]"
			/>
			<span className="-mt-1.5 rounded-full bg-ink px-[7px] py-px font-mono text-[9px] leading-3 font-semibold text-white uppercase">
				admin
			</span>
			<div className="h-1" />
			{railItems.main.map((item) => (
				<CompactNavItem
					key={item.label}
					item={item}
					active={active(item.href)}
					className="w-full"
				/>
			))}
			<span aria-hidden="true" className="h-px w-10 bg-text-primary/20" />
			<CompactNavItem
				item={railItems.data}
				active={active(railItems.data.href)}
				className="w-full"
			/>
		</nav>
	);
}
