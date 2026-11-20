"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { eventEditHref } from "@/lib/events/links";
import {
	EventDeleteDialog,
	type EventDeleteTarget,
} from "../event-delete-dialog";

/** A program fejléc-műveletei; a kliens csak az id-t, a nevet és a jelentkezésszámot kapja. */
export function EventActions({ target }: { target: EventDeleteTarget }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	// A párbeszédablak minden megnyitáskor újra felépül (tiszta nyugtázás/hibaállapot).
	const [run, setRun] = useState(0);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button asChild variant="surface">
				<Link href={eventEditHref(target.id)}>
					<Pencil aria-hidden="true" />
					Szerkesztés
				</Link>
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="További műveletek"
					className="flex size-9 items-center justify-center rounded-full border border-border-default bg-white hover:bg-surface-subtle"
				>
					<MoreHorizontal
						aria-hidden="true"
						className="size-[18px]"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						className="text-error-fg focus:text-error-fg [&_svg]:text-error-fg!"
						onSelect={() => {
							setRun((r) => r + 1);
							setOpen(true);
						}}
					>
						<Trash2 aria-hidden="true" />
						Program törlése
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<EventDeleteDialog
				key={run}
				target={open ? target : null}
				onOpenChange={setOpen}
				onDeleted={() => {
					setOpen(false);
					// replace: a törölt program címe nem marad az előzményekben.
					router.replace("/events");
					router.refresh();
				}}
			/>
		</div>
	);
}
