"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/initials";

export type ShellUser = {
	name: string | null;
	email: string | null;
	image: string | null;
};

export function UserMenu({ user }: { user: ShellUser }) {
	const [pending, setPending] = useState(false);
	const displayName = user.name ?? user.email ?? "Admin";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Felhasználói menü"
				className="flex items-center gap-2.5 rounded-full text-left focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
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
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
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
