"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, navItems } from "./nav-items";

const itemBase =
	"flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium [&_svg]:size-[18px] [&_svg]:shrink-0";

export function AdminSidebar({ className }: { className?: string }) {
	const pathname = usePathname();

	return (
		<nav
			aria-label="Főmenü"
			className={cn(
				"flex h-full flex-col gap-1 bg-sky px-3.5 pt-5 pb-4 text-text-primary",
				className,
			)}
		>
			<div className="flex items-center gap-2.5 pt-0.5 pr-2 pb-[18px] pl-1">
				<Image
					src="/brand/skool-logo.png"
					alt="Skool"
					width={105}
					height={34}
					className="ml-1.5 h-[34px] w-auto"
					priority
				/>
				<span className="flex-1" />
				<span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] leading-4 font-semibold text-white uppercase">
					admin
				</span>
			</div>

			<div className="px-3 pt-3 pb-1.5 font-mono text-[11px] leading-4 font-semibold uppercase">
				Főmenü
			</div>
			{navItems.map(({ label, icon: Icon, href }) => {
				const active = isActive(href, pathname);
				return (
					<Link
						key={label}
						href={href}
						aria-current={active ? "page" : undefined}
						className={cn(
							itemBase,
							"focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							active ? "bg-ink text-white" : "hover:bg-white/40",
						)}
					>
						<Icon aria-hidden="true" />
						<span className="flex-1">{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
