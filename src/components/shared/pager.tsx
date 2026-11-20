"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCount } from "@/lib/applicants/format";
import { PAGE_SIZES, type PageSize } from "@/lib/applicants/list-params";
import { pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

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
				<span className="relative">
					<select
						value={pageSize}
						onChange={(e) =>
							onPageSize(Number(e.target.value) as PageSize)
						}
						className="h-8 appearance-none rounded-full border border-border-strong bg-white pr-8 pl-3 text-xs text-text-primary"
					>
						{PAGE_SIZES.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
					<ChevronDown
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-text-secondary"
					/>
				</span>
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
