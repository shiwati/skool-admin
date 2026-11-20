"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export type ShellUser = {
	name: string | null;
	email: string | null;
	image: string | null;
};

/**
 * `compact` (mobil felső sáv): a gomb csak az avatar (44 px-es célfelület),
 * a név és az e-mail a menü tetején jelenik meg.
 */
export function UserMenu({
	user,
	compact = false,
}: {
	user: ShellUser;
	compact?: boolean;
}) {
	const [pending, setPending] = useState(false);
	const displayName = user.name ?? user.email ?? "Admin";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Felhasználói menü"
				className={cn(
					"flex items-center gap-2.5 rounded-full text-left",
					compact && "size-11 justify-center",
				)}
			>
				{user.image ? (
					// Google profile pictures come from an external host; a plain
					// <img> avoids configuring remote image domains.
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={user.image}
						alt=""
						referrerPolicy="no-referrer"
						className="size-8 rounded-full object-cover"
					/>
				) : (
					<span
						aria-hidden="true"
						className="flex size-8 items-center justify-center rounded-full bg-lavender text-xs font-semibold"
					>
						{initials(displayName)}
					</span>
				)}
				{!compact && (
					<>
						<span className="flex flex-col">
							<span className="text-sm leading-5 font-medium">
								{displayName}
							</span>
							{user.email && (
								<span className="text-xs leading-4 text-text-tertiary">
									{user.email}
								</span>
							)}
						</span>
						<ChevronDown aria-hidden="true" className="size-4" />
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				{compact && (
					<>
						<DropdownMenuLabel className="flex flex-col">
							<span className="text-sm font-medium">
								{displayName}
							</span>
							{user.email && (
								<span className="text-xs font-normal text-text-tertiary">
									{user.email}
								</span>
							)}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem
					disabled={pending}
					onSelect={() => {
						if (pending) return;
						setPending(true);
						void signOut({ callbackUrl: "/login" });
					}}
				>
					<LogOut aria-hidden="true" />
					Kijelentkezés
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
