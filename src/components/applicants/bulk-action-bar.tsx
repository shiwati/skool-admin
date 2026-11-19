"use client";

import { Copy, Trash2, X } from "lucide-react";
import { formatCount } from "@/lib/applicants/format";

const action =
	"inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-[13px] whitespace-nowrap hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none [&_svg]:size-4";

/** Lebegő sáv a kijelölt sorok tömeges műveleteihez (terv: 03.2). */
export function BulkActionBar({
	count,
	onCopyEmails,
	onDelete,
	onClear,
}: {
	count: number;
	onCopyEmails: () => void;
	onDelete: () => void;
	onClear: () => void;
}) {
	if (count === 0) return null;

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-7 z-40 flex justify-center pl-[248px]">
			<div
				role="toolbar"
				aria-label="Tömeges műveletek"
				className="pointer-events-auto flex max-w-[calc(100%-32px)] flex-wrap items-center gap-1 rounded-full bg-ink py-2 pr-2 pl-[18px] text-white shadow-overlay"
			>
				<span className="mr-1.5 text-sm font-medium" aria-live="polite">
					{formatCount(count)} kijelölve
				</span>
				<span aria-hidden="true" className="h-5 w-px bg-white/25" />
				<button type="button" className={action} onClick={onCopyEmails}>
					<Copy aria-hidden="true" />
					E-mail címek másolása
				</button>
				<button
					type="button"
					className={`${action} text-coral`}
					onClick={onDelete}
				>
					<Trash2 aria-hidden="true" />
					Jelentkezők törlése
				</button>
				<button
					type="button"
					aria-label="Kijelölés megszüntetése"
					onClick={onClear}
					className="flex size-8 items-center justify-center rounded-full bg-white/12 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			</div>
		</div>
	);
}
