"use client";

import { toast } from "sonner";
import { AcknowledgedDeleteDialog } from "@/components/shared/acknowledged-delete-dialog";
import { apiFetch } from "@/lib/api/client";
import { formatCount } from "@/lib/format";

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
	return (
		<AcknowledgedDeleteDialog
			open={target !== null}
			onOpenChange={onOpenChange}
			title={<>Törlöd a(z) {target?.name} programot?</>}
			description={
				<>
					A program véglegesen törlődik
					{target && target.applications > 0
						? `, a hozzá tartozó ${formatCount(target.applications)} jelentkezéssel együtt`
						: ""}
					, és nem állítható vissza. A jelentkezők adatai megmaradnak.
				</>
			}
			onConfirm={async () => {
				if (!target) return;
				await apiFetch(`/api/events/${encodeURIComponent(target.id)}`, {
					method: "DELETE",
				});
				toast.success(`${target.name} törölve`);
				onDeleted();
			}}
		/>
	);
}
