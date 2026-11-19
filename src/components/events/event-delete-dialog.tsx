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

export type EventDeleteTarget = {
	id: string;
	name: string;
	applications: number;
};

export function EventDeleteDialog({
	target,
	onOpenChange,
	onDeleted,
}: {
	target: EventDeleteTarget | null;
	onOpenChange: (open: boolean) => void;
	onDeleted: () => void;
}) {
	// The parent remounts this dialog per target (via `key`), so the
	// acknowledgement and error state always start fresh.
	const [acknowledged, setAcknowledged] = useState(false);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	async function confirm() {
		if (!target || pending) return;
		setPending(true);
		setFailed(false);
		try {
			await apiFetch(`/api/events/${encodeURIComponent(target.id)}`, {
				method: "DELETE",
			});
			toast.success(`${target.name} törölve`);
			onDeleted();
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
					<AlertDialogTitle>
						Törlöd a(z) {target?.name} programot?
					</AlertDialogTitle>
					<AlertDialogDescription>
						A program véglegesen törlődik
						{target && target.applications > 0
							? `, a hozzá tartozó ${formatCount(target.applications)} jelentkezéssel együtt`
							: ""}
						, és nem állítható vissza. A jelentkezők adatai
						megmaradnak.
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
					<AlertDialogCancel disabled={pending}>
						Mégse
					</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={!acknowledged || pending}
						aria-busy={pending || undefined}
						onClick={() => void confirm()}
					>
						<Trash2 aria-hidden="true" />
						Törlés
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
