"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api/client";
import { formatCount } from "@/lib/applicants/format";

export type DeleteTarget = {
	ids: string[];
	/** Egy jelentkezőnél a neve; több esetén `null` (a darabszám jelenik meg). */
	name: string | null;
};

export function DeleteDialog({
	target,
	onOpenChange,
	onDeleted,
}: {
	target: DeleteTarget | null;
	onOpenChange: (open: boolean) => void;
	onDeleted: (deleted: number) => void;
}) {
	// The parent remounts this dialog per target (via `key`), so the
	// acknowledgement and error state always start fresh.
	const [acknowledged, setAcknowledged] = useState(false);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	const count = target?.ids.length ?? 0;
	const title = target?.name
		? `Törlöd ${target.name} adatait?`
		: `Törlöd a kijelölt ${formatCount(count)} jelentkezőt?`;

	async function confirm() {
		if (!target || pending) return;
		setPending(true);
		setFailed(false);
		try {
			const result = await apiFetch<{ deleted: number }>(
				"/api/applicants/delete",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ ids: target.ids }),
				},
			);
			toast.success(`${formatCount(result.deleted)} jelentkező törölve`);
			onDeleted(result.deleted);
		} catch {
			setFailed(true);
			setPending(false);
		}
	}

	return (
		<AlertDialog
			open={target !== null}
			onOpenChange={(open) => !pending && onOpenChange(open)}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>
						A személyes adatok (név, elérhetőségek, iskola, szülői
						adatok) véglegesen törlődnek, és nem állíthatók vissza.
						A jelentkezések programja és státusza névtelenül
						megmarad a statisztikákhoz.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={acknowledged}
						disabled={pending}
						onCheckedChange={(checked) =>
							setAcknowledged(checked === true)
						}
					/>
					Értem, a törlés nem vonható vissza
				</label>

				{failed && (
					<p role="alert" className="text-sm text-error-fg">
						A törlés nem sikerült. Próbáld újra.
					</p>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel
						disabled={pending}
						className="rounded-full"
					>
						Mégse
					</AlertDialogCancel>
					<Button
						variant="destructive"
						className="rounded-full"
						disabled={!acknowledged || pending}
						aria-busy={pending || undefined}
						onClick={() => void confirm()}
					>
						<Trash2 aria-hidden="true" />
						{count > 1
							? `${formatCount(count)} jelentkező törlése`
							: "Törlés"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
