"use client";

import { Copy, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount } from "@/lib/applicants/format";

export function ApplicantsHeader({
	total,
	filtered = false,
	onEmailList,
}: {
	/** `null`, amíg az első lekérés nem fejeződött be. */
	total: number | null;
	/** Szűrt állapotban a szám a találatok száma, nem az összes profilé. */
	filtered?: boolean;
	onEmailList: () => void;
}) {
	return (
		<PageHeader
			eyebrow="Jelentkezők"
			title="Jelentkezők"
			description={
				total !== null &&
				`${filtered ? "Találatok száma" : "Összes jelentkező"}: ${formatCount(total)} fő`
			}
			// Mobile (board 03.1 M): secondary actions collapse into one menu.
			mobileActions={
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="További műveletek"
						className="flex size-11 items-center justify-center rounded-full border border-border-default bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
					>
						<MoreHorizontal
							aria-hidden="true"
							className="size-[18px]"
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onEmailList}>
							<Copy aria-hidden="true" />
							E-mail lista
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			}
			actions={
				<Button variant="surface" onClick={onEmailList}>
					<Copy aria-hidden="true" />
					E-mail lista
				</Button>
			}
		/>
	);
}
