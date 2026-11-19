"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCount } from "@/lib/applicants/format";
import { PAGE_SIZES, type PageSize } from "@/lib/applicants/list-params";
import { cn } from "@/lib/utils";

/** Megjelenítendő oldalszámok, a kihagyásokat `null` jelöli: 1 … 4 5 6 … 50. */
export function pageNumbers(
	page: number,
	pageCount: number,
): (number | null)[] {
	if (pageCount <= 7)
		return Array.from({ length: pageCount }, (_, i) => i + 1);
	const pages = new Set([1, pageCount, page - 1, page, page + 1]);
	const sorted = [...pages]
		.filter((p) => p >= 1 && p <= pageCount)
		.sort((a, b) => a - b);
	const result: (number | null)[] = [];
	for (const [i, p] of sorted.entries()) {
		if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
		result.push(p);
	}
	return result;
}

const pageButton =
	"flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

export function Pager({
	total,
	page,
	pageSize,
	onPage,
	onPageSize,
	itemLabel = "jelentkező",
}: {
	total: number;
	page: number;
	pageSize: PageSize;
	onPage: (page: number) => void;
	onPageSize: (size: PageSize) => void;
	/** A számlált elemek neve a „1–10 / 42 …” feliratban. */
	itemLabel?: string;
}) {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="flex flex-wrap items-center gap-3 border-t border-border-default px-4 py-3">
			<span className="flex-1 text-xs text-text-secondary">
				{formatCount(from)}–{formatCount(to)} / {formatCount(total)}{" "}
				{itemLabel}
			</span>
			<label className="flex items-center gap-2 text-xs text-text-secondary">
				Sorok / oldal
				<select
					value={pageSize}
					onChange={(e) =>
						onPageSize(Number(e.target.value) as PageSize)
					}
					className="h-8 rounded-full border border-border-strong bg-white px-3 text-xs text-text-primary"
				>
					{PAGE_SIZES.map((size) => (
						<option key={size} value={size}>
							{size}
						</option>
					))}
				</select>
			</label>
			<nav aria-label="Lapozás" className="flex items-center gap-1">
				<button
					type="button"
					className={cn(pageButton, "hover:bg-surface-subtle")}
					aria-label="Előző oldal"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
				>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</button>
				{pageNumbers(page, pageCount).map((p, i) =>
					p === null ? (
						<span
							key={`gap-${i}`}
							aria-hidden="true"
							className="px-1 text-xs text-text-tertiary"
						>
							…
						</span>
					) : (
						<button
							key={p}
							type="button"
							aria-label={`${p}. oldal`}
							aria-current={p === page ? "page" : undefined}
							className={cn(
								pageButton,
								p === page
									? "bg-ink text-white"
									: "hover:bg-surface-subtle",
							)}
							onClick={() => onPage(p)}
						>
							{p}
						</button>
					),
				)}
				<button
					type="button"
					className={cn(pageButton, "hover:bg-surface-subtle")}
					aria-label="Következő oldal"
					disabled={page >= pageCount}
					onClick={() => onPage(page + 1)}
				>
					<ChevronRight aria-hidden="true" className="size-4" />
				</button>
			</nav>
		</div>
	);
}
