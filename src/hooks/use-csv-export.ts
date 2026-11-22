"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isAbortError } from "@/lib/api/client";
import { downloadCsv } from "@/lib/download";
import { formatCount, formatDate } from "@/lib/format";

/** `jelentkezok-2026-11-20.csv` */
export function csvFilename(base: string, now: Date = new Date()): string {
	return `${base}-${formatDate(now).replaceAll(".", "-")}.csv`;
}

/**
 * CSV-export futtatása: egyszerre egy fut, kilépéskor megszakad, a kimenetet
 * letölti, az eredményről (vagy hibáról) értesít.
 */
export function useCsvExport() {
	const [exporting, setExporting] = useState(false);
	const controllerRef = useRef<AbortController | null>(null);

	useEffect(() => () => controllerRef.current?.abort(), []);

	const run = useCallback(
		async (
			filename: string,
			build: (
				signal: AbortSignal,
			) => Promise<{ csv: string; rows: number }>,
		) => {
			if (controllerRef.current) return;
			const controller = new AbortController();
			controllerRef.current = controller;
			setExporting(true);
			try {
				const { csv, rows } = await build(controller.signal);
				if (controller.signal.aborted) return;
				if (rows === 0) {
					toast.info(
						"Nincs exportálható sor a szűrésnek megfelelően.",
					);
					return;
				}
				downloadCsv(filename, csv);
				toast.success(`${formatCount(rows)} sor exportálva`);
			} catch (error) {
				if (controller.signal.aborted || isAbortError(error)) return;
				toast.error("Az exportálás nem sikerült. Próbáld újra.");
			} finally {
				controllerRef.current = null;
				setExporting(false);
			}
		},
		[],
	);

	return { exporting, run };
}
