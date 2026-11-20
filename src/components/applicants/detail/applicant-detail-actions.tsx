"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { DeleteDialog, type DeleteTarget } from "../delete-dialog";

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
			<Button asChild variant="surface">
				<Link href={`/applicants/${encodeURIComponent(id)}/edit`}>
					<Pencil aria-hidden="true" />
					Szerkesztés
				</Link>
			</Button>
			<TooltipIconButton
				label="Profil törlése"
				variant="surface"
				className="text-error-fg"
				onClick={() => {
					setRun((r) => r + 1);
					setTarget({ ids: [id], name });
				}}
			>
				<Trash2 aria-hidden="true" />
			</TooltipIconButton>
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
