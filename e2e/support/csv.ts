import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

/** Egy letöltött CSV export: fájlnév, nyers bájtok és a feldolgozott sorok. */
export type CsvDownload = {
	filename: string;
	bytes: Buffer;
	/** A fejléc nélküli sorok, cellákra bontva. */
	rows: string[][];
	header: string[];
};

/** Az „Exportálás CSV-be” gomb megnyomása és a letöltött fájl beolvasása. */
export async function exportCsv(page: Page): Promise<CsvDownload> {
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Exportálás CSV-be" }).click(),
	]);
	const bytes = readFileSync(await download.path());
	const [header, ...rows] = parseCsv(bytes.toString("utf8"));
	return { filename: download.suggestedFilename(), bytes, header, rows };
}

/**
 * Pontosvesszős, CRLF-es CSV (az app formátuma, `src/lib/csv.ts`): BOM
 * nélkül, idézőjeles cellákkal. Szándékosan független az app kódjától.
 */
export function parseCsv(text: string): string[][] {
	const body = text.replace(/^﻿/, "");
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (quoted) {
			if (ch === '"' && body[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (ch === '"') {
				quoted = false;
			} else {
				cell += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === ";") {
			row.push(cell);
			cell = "";
		} else if (ch === "\r" && body[i + 1] === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
			i++;
		} else {
			cell += ch;
		}
	}
	if (cell || row.length) rows.push([...row, cell]);
	return rows;
}

/** A mai nap budapesti idő szerint, `ÉÉÉÉ-HH-NN`. */
export function todayInBudapest(): string {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Europe/Budapest",
	}).format(new Date());
}
