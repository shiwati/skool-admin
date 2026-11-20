import type {
	DocsDocument,
	DocsStructuralElement,
	DocsTableCell,
	DocsTextStyle,
} from "@/lib/google/docs";
import {
	ageRangeText,
	isVolunteer,
	reportDayText,
	type ReportDocumentData,
} from "./format";

/**
 * A záró riport Google Doc sablonjának kitöltése (tiszta függvények). A
 * sablonban `{név}` alakú helyőrzők vannak; a „Kik vettek részt?” táblázatban
 * egyetlen mintasor (`{person.role}` · `{person.org}` · `{person.name}`), amit
 * az app annyiszor másol, ahány közreműködő van. A `[…]` szövegeket a csapat
 * kézzel írja meg. Lásd `docs/plans/report-google-doc-template.md`.
 */

export const PERSON_FIELDS = {
	"{person.role}": "role",
	"{person.org}": "organization",
	"{person.name}": "name",
} as const;

export const PERSON_ROW_MARKER = "{person.role}";

type Person = ReportDocumentData["people"][number];

const percent = (value: number | null | undefined) =>
	value === null || value === undefined ? "" : String(value);

/** Az egyszerű helyőrzők értékei (a kulcs a kapcsos zárójeles helyőrző). */
export function templateValues(d: ReportDocumentData): Record<string, string> {
	const volunteers = d.people.filter((p) => isVolunteer(p.role));
	const metric = (key: string) =>
		d.metrics.find((m) => m.key === key)?.percent;
	const quotes = [...d.highlightedQuotes, ...d.quotes].map(
		(q) => `„${q.text}” – ${q.role}`,
	);

	return {
		"{company_name}": d.companyName?.trim() ?? "",
		"{event_name}": d.eventName,
		"{event_date}": reportDayText(d.from, d.to),
		"{place}": d.location?.trim() || d.companyName?.trim() || "",
		"{count}": String(d.participants),
		"{age}": ageRangeText(d.ageRange) ?? "",
		"{people_count}": String(d.people.length),
		"{volunteer_count}": String(volunteers.length),
		"{volunteer_names}": volunteers
			.map((v) =>
				v.organization ? `${v.name} (${v.organization})` : v.name,
			)
			.join(", "),
		"{all_names}": d.people
			.map((p) => p.name)
			.filter(Boolean)
			.join(" · "),
		"{max_m}": percent(metric("mentorRating")),
		"{max_t}": percent(metric("instructorRating")),
		"{rate}": percent(d.recommendPercent),
		// Egy bekezdés: a sortörés új bekezdést kezd ugyanazzal a stílussal.
		"{quote.text}": quotes.join("\n"),
	};
}

// --- Dokumentumbejárás ----------------------------------------------------

function cellText(cell: DocsTableCell): string {
	return (cell.content ?? [])
		.flatMap((el) => el.paragraph?.elements ?? [])
		.map((e) => e.textRun?.content ?? "")
		.join("");
}

export type TemplateRow = {
	tableStartIndex: number;
	rowIndex: number;
	cells: DocsTableCell[];
	/** A tábla további sorai (a mintasor utániak is). */
	rows: DocsTableCell[][];
};

/** Megkeresi azt a táblázatsort (beágyazott táblákban is), amelyben `marker` szerepel. */
export function findTemplateRow(
	doc: DocsDocument,
	marker: string = PERSON_ROW_MARKER,
): TemplateRow | null {
	const walk = (elements: DocsStructuralElement[]): TemplateRow | null => {
		for (const el of elements) {
			if (!el.table) continue;
			const rows = (el.table.tableRows ?? []).map(
				(r) => r.tableCells ?? [],
			);
			for (const [rowIndex, cells] of rows.entries()) {
				if (cells.some((c) => cellText(c).includes(marker))) {
					return {
						tableStartIndex: el.startIndex ?? 0,
						rowIndex,
						cells,
						rows,
					};
				}
			}
			for (const cells of rows) {
				for (const cell of cells) {
					const found = walk(cell.content ?? []);
					if (found) return found;
				}
			}
		}
		return null;
	};
	return walk(doc.body?.content ?? []);
}

const cellLocation = (row: TemplateRow) => ({
	tableStartLocation: { index: row.tableStartIndex },
	rowIndex: row.rowIndex,
	columnIndex: 0,
});

/**
 * 1. kör: a mintasor törlése (nincs közreműködő), vagy `count - 1` üres sor
 * beszúrása alá (a mintasor stílusával). A mintasort a helyőrző-csere tölti ki.
 */
export function personRowStructureRequests(
	row: TemplateRow,
	count: number,
): unknown[] {
	if (count === 0) {
		return [{ deleteTableRow: { tableCellLocation: cellLocation(row) } }];
	}
	return Array.from({ length: count - 1 }, () => ({
		insertTableRow: {
			tableCellLocation: cellLocation(row),
			insertBelow: true,
		},
	}));
}

/** A cella melyik közreműködő-mezőt tartalmazza, és milyen betűstílussal. */
function cellField(cell: DocsTableCell) {
	for (const el of cell.content ?? []) {
		for (const e of el.paragraph?.elements ?? []) {
			const text = e.textRun?.content ?? "";
			for (const [marker, field] of Object.entries(PERSON_FIELDS)) {
				if (text.includes(marker)) {
					return { field, style: e.textRun?.textStyle ?? {} };
				}
			}
		}
	}
	return null;
}

function cellInsertIndex(cell: DocsTableCell): number | null {
	const first = cell.content?.[0];
	return first?.startIndex ?? cell.startIndex ?? null;
}

/**
 * 2. kör (a sorbeszúrás utáni dokumentumon): a beszúrt sorok celláiba írja a
 * 2., 3., … közreműködő adatait a mintacella betűstílusával. Hátulról előre
 * halad, így a korábbi indexek nem csúsznak el.
 */
export function personRowFillRequests(
	row: TemplateRow,
	people: Person[],
): unknown[] {
	const columns = row.cells.map(cellField);
	const inserts: { index: number; text: string; style: DocsTextStyle }[] = [];
	for (let i = 1; i < people.length; i++) {
		const cells = row.rows[row.rowIndex + i] ?? [];
		for (const [col, cell] of cells.entries()) {
			const column = columns[col];
			const index = cellInsertIndex(cell);
			if (!column || index === null) continue;
			const text = people[i][column.field];
			if (text) inserts.push({ index, text, style: column.style });
		}
	}
	inserts.sort((a, b) => b.index - a.index);
	return inserts.flatMap(({ index, text, style }) => [
		{ insertText: { location: { index }, text } },
		{
			updateTextStyle: {
				range: { startIndex: index, endIndex: index + text.length },
				textStyle: style,
				fields: "*",
			},
		},
	]);
}

/** 3. kör: minden helyőrző cseréje (a mintasort az első közreműködő tölti ki). */
export function replaceRequests(
	values: Record<string, string>,
	firstPerson: Person | undefined,
): unknown[] {
	const all: Record<string, string> = { ...values };
	for (const [marker, field] of Object.entries(PERSON_FIELDS)) {
		all[marker] = firstPerson?.[field] ?? "";
	}
	return Object.entries(all).map(([text, replaceText]) => ({
		replaceAllText: {
			containsText: { text, matchCase: true },
			replaceText,
		},
	}));
}
