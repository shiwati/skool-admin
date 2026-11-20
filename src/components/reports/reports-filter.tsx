"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ReportsTable } from "@/components/reports/reports-table";
import type { ReportListItem } from "@/lib/reports/list";

/** Kis-/nagybetű- és ékezetfüggetlen összehasonlításhoz. */
function fold(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

/** Kliens oldali névszűrő a Riportok listához (program- és cégnév). */
export function ReportsFilter({ rows }: { rows: ReportListItem[] }) {
	const [query, setQuery] = useState("");
	const needle = fold(query);

	const filtered = useMemo(() => {
		if (!needle) return rows;
		return rows.filter((row) =>
			fold(`${row.name} ${row.companyName ?? ""}`).includes(needle),
		);
	}, [rows, needle]);

	return (
		<div className="flex flex-col gap-3">
			<Input
				type="search"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Szűrés névre…"
				aria-label="Szűrés programnévre"
				className="max-w-sm"
			/>
			{filtered.length === 0 ? (
				<p className="rounded-[14px] border border-border-default bg-white p-6 text-sm text-text-secondary">
					Nincs a szűrésnek megfelelő program.
				</p>
			) : (
				<ReportsTable rows={filtered} />
			)}
		</div>
	);
}
