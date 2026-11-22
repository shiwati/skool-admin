"use client";

import { toast } from "sonner";
import { AcknowledgedDeleteDialog } from "@/components/shared/acknowledged-delete-dialog";
import { apiFetch, jsonInit } from "@/lib/api/client";
import { formatCount } from "@/lib/format";

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
	const count = target?.ids.length ?? 0;

	return (
		<AcknowledgedDeleteDialog
			open={target !== null}
			onOpenChange={onOpenChange}
			title={
				target?.name
					? `Törlöd ${target.name} adatait?`
					: `Törlöd a kijelölt ${formatCount(count)} jelentkezőt?`
			}
			description="A személyes adatok (név, elérhetőségek, iskola, szülői adatok) véglegesen törlődnek, és nem állíthatók vissza. A jelentkezések programja és státusza névtelenül megmarad a statisztikákhoz."
			confirmLabel={
				count > 1
					? `${formatCount(count)} jelentkező törlése`
					: "Törlés"
			}
			onConfirm={async () => {
				if (!target) return;
				const result = await apiFetch<{ deleted: number }>(
					"/api/applicants/delete",
					jsonInit("POST", { ids: target.ids }),
				);
				toast.success(
					`${formatCount(result.deleted)} jelentkező törölve`,
				);
				onDeleted(result.deleted);
			}}
		/>
	);
}
