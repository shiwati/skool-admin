"use client";

import { MoreHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CompactNavItem } from "./compact-nav-item";
import { isActive, mobileMoreItems, mobileTabItems } from "./nav-items";
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
 * Mobil alsó navigáció (fix, 72 px + safe area) a „Több” lappal, a
 * „Mobil alsó navigáció” terv szerint.
 */
export function MobileTabBar({ className }: { className?: string }) {
	const pathname = usePathname();
	const [moreOpen, setMoreOpen] = useState(false);
	const moreActive = mobileMoreItems.some(
		(item) => item.href && isActive(item.href, pathname),
	);

	return (
		<>
			<nav
				aria-label="Főmenü"
				className={cn(
					"fixed inset-x-0 bottom-0 z-40 flex items-start border-t border-border-default bg-white px-1 pt-2 pb-[max(env(safe-area-inset-bottom),8px)]",
					className,
				)}
			>
				{mobileTabItems.map((item) => (
					<CompactNavItem
						key={item.label}
						item={item}
						active={!!item.href && isActive(item.href, pathname)}
						className="flex-1 text-text-secondary aria-[current=page]:text-text-primary"
					/>
				))}
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={moreOpen}
					onClick={() => setMoreOpen(true)}
					className={cn(
						"flex min-h-11 flex-1 flex-col items-center gap-1 rounded-lg text-[10px] leading-3 font-medium text-text-secondary focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
						moreActive && "font-semibold text-text-primary",
					)}
				>
					<span
						className={cn(
							"flex h-8 w-13 items-center justify-center rounded-full [&_svg]:size-5",
							moreActive && "bg-ink text-white",
						)}
					>
						<MoreHorizontal aria-hidden="true" />
					</span>
					Több
				</button>
			</nav>
			<MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
		</>
	);
}

/** A mobil „Több” lap: a fülekre nem fért menüpontok, alulról nyíló lapként. */
export function MoreSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const pathname = usePathname();
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-2 rounded-t-[20px] rounded-b-none border-0 bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:max-w-none"
			>
				<div className="flex items-center justify-between">
					<DialogTitle className="text-base font-bold">
						Több
					</DialogTitle>
					<DialogClose
						aria-label="Bezárás"
						className="flex size-11 items-center justify-center rounded-full hover:bg-surface-subtle"
					>
						<X aria-hidden="true" className="size-5" />
					</DialogClose>
				</div>
				<DialogDescription className="sr-only">
					További menüpontok
				</DialogDescription>
				<ul className="flex flex-col">
					{mobileMoreItems.map((item) => {
						const Icon = item.icon;
						const row =
							"flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium [&_svg]:size-5";
						return (
							<li key={item.label}>
								{item.href ? (
									<Link
										href={item.href}
										aria-current={
											isActive(item.href, pathname)
												? "page"
												: undefined
										}
										onClick={() => onOpenChange(false)}
										className={cn(
											row,
											"hover:bg-surface-subtle",
										)}
									>
										<Icon aria-hidden="true" />
										{item.label}
									</Link>
								) : (
									<span
										role="link"
										aria-disabled="true"
										aria-label={item.label}
										className={cn(
											row,
											"cursor-not-allowed text-text-primary/45",
										)}
									>
										<Icon aria-hidden="true" />
										<span className="flex-1">
											{item.label}
										</span>
										<span className="text-xs">
											Hamarosan
										</span>
									</span>
								)}
							</li>
						);
					})}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
