"use client";

import { MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteDialog, type DeleteTarget } from "../delete-dialog";

const LATER = "Hamarosan elérhető.";

function UnavailableButton({
	id,
	variant,
	children,
}: {
	id: string;
	variant: "surface";
	children: ReactNode;
}) {
	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					{/* Disabled buttons get no pointer or focus events, so the
					    wrapper carries the tooltip trigger. */}
					<span tabIndex={0} className="rounded-full">
						<Button
							variant={variant}
							disabled
							aria-describedby={id}
							className="rounded-full"
						>
							{children}
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>{LATER}</TooltipContent>
			</Tooltip>
			<span id={id} className="sr-only">
				{LATER}
			</span>
		</>
	);
}

/** Az adatlap fejléc-műveletei; a kliens csak az id-t és a nevet kapja. */
export function ApplicantDetailActions({
	id,
	name,
}: {
	id: string;
	name: string;
}) {
	const router = useRouter();
	const [target, setTarget] = useState<DeleteTarget | null>(null);
	const [run, setRun] = useState(0);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<TooltipProvider>
				<UnavailableButton id="confirm-unavailable" variant="surface">
					<Send aria-hidden="true" />
					Visszaigazolás küldése
				</UnavailableButton>
			</TooltipProvider>
			<Button asChild className="rounded-full">
				<Link href={`/applicants/${encodeURIComponent(id)}/edit`}>
					<Pencil aria-hidden="true" />
					Szerkesztés
				</Link>
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="További műveletek"
					className="flex size-10 items-center justify-center rounded-full border border-border-default bg-white hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
				>
					<MoreHorizontal
						aria-hidden="true"
						className="size-[18px]"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						className="text-error-fg focus:text-error-fg"
						onSelect={() => {
							setRun((r) => r + 1);
							setTarget({ ids: [id], name });
						}}
					>
						<Trash2 aria-hidden="true" />
						Törlés
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeleteDialog
				key={`delete-${run}`}
				target={target}
				onOpenChange={(open) => !open && setTarget(null)}
				onDeleted={() => {
					// replace: the deleted applicant's URL stays out of history.
					router.replace("/applicants");
					router.refresh();
				}}
			/>
		</div>
	);
}
