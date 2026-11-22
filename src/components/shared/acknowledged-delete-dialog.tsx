"use client";

import { Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
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

/**
 * Visszavonhatatlan törlés megerősítése: a gomb csak az „Értem, a törlés
 * nem vonható vissza” bepipálása után aktív. Futás közben a dialógus nem
 * zárható be; ha az `onConfirm` hibát dob, hibaüzenet jelenik meg, és újra
 * lehet próbálni. A szülő célpontonként újramountolja (`key`), így az
 * állapot mindig tisztán indul.
 */
export function AcknowledgedDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Törlés",
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	confirmLabel?: ReactNode;
	/** A törlés; sikerkor a hívó zárja a dialógust. */
	onConfirm: () => Promise<void>;
}) {
	const [acknowledged, setAcknowledged] = useState(false);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	async function confirm() {
		if (pending) return;
		setPending(true);
		setFailed(false);
		try {
			await onConfirm();
		} catch {
			setFailed(true);
			setPending(false);
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => !pending && onOpenChange(next)}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>
						{description}
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
						{confirmLabel}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
