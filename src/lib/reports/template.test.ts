import { describe, expect, it } from "vitest";
import type { DocsDocument, DocsTableCell } from "@/lib/google/docs";
import type { ReportDocumentData } from "./format";
import {
	findTemplateRow,
	personRowFillRequests,
	personRowStructureRequests,
	replaceRequests,
	templateValues,
} from "./template";

const data: ReportDocumentData = {
	eventName: "Minecraft workshop",
	companyName: "Példa Zrt.",
	from: new Date("2025-05-16T13:00:00Z"),
	to: new Date("2025-05-16T16:30:00Z"),
	location: "Budapest",
	ageRange: "10-12",
	participants: 15,
	people: [
		{ role: "Oktató", organization: "Skool", name: "Tóth Réka" },
		{ role: "Mentor", organization: "Példa Zrt.", name: "Kiss Dániel" },
		{ role: "Önkéntes", organization: "", name: "Nagy Anna" },
	],
	highlightedQuotes: [
		{ text: "Szuper volt", role: "résztvevő", kind: "PARTICIPANT" },
	],
	quotes: [{ text: "Jó móka", role: "mentor", kind: "MENTOR" }],
	metrics: [
		{ key: "mentorRating", percent: 93, phrase: "" },
		{ key: "instructorRating", percent: 100, phrase: "" },
	],
	recommendPercent: null,
};

describe("templateValues", () => {
	it("fills every simple placeholder", () => {
		expect(templateValues(data)).toEqual({
			"{company_name}": "Példa Zrt.",
			"{event_name}": "Minecraft workshop",
			"{event_date}": "2025. május 16.",
			"{place}": "Budapest",
			"{count}": "15",
			"{age}": "10–12",
			"{people_count}": "3",
			"{volunteer_count}": "2",
			"{volunteer_names}": "Kiss Dániel (Példa Zrt.), Nagy Anna",
			"{all_names}": "Tóth Réka · Kiss Dániel · Nagy Anna",
			"{max_m}": "93",
			"{max_t}": "100",
			"{rate}": "",
			"{quote.text}": "„Szuper volt” – résztvevő\n„Jó móka” – mentor",
		});
	});

	it("shows a date range for multi-day events and falls back to the company as place", () => {
		const v = templateValues({
			...data,
			location: null,
			to: new Date("2025-05-18T16:00:00Z"),
		});
		expect(v["{event_date}"]).toBe("2025. május 16. – 2025. május 18.");
		expect(v["{place}"]).toBe("Példa Zrt.");
	});
});

// --- Docs fixture: a layout table whose left cell holds the people table ---

const run = (start: number, content: string, bold = false) => ({
	startIndex: start,
	endIndex: start + content.length,
	textRun: { content, textStyle: bold ? { bold: true } : {} },
});
const cell = (start: number, text: string, bold = false): DocsTableCell => ({
	startIndex: start,
	endIndex: start + text.length + 1,
	content: [
		{
			startIndex: start + 1,
			endIndex: start + 1 + text.length,
			paragraph: { elements: [run(start + 1, text, bold)] },
		},
	],
});

function doc(extraRows: number): DocsDocument {
	const rows = [
		{
			tableCells: [
				cell(110, "SZEREP\n"),
				cell(120, "SZERVEZET\n"),
				cell(135, "NÉV\n"),
			],
		},
		{
			tableCells: [
				cell(150, "{person.role}\n", true),
				cell(170, "{person.org}\n"),
				cell(190, "{person.name}\n"),
			],
		},
		...Array.from({ length: extraRows }, (_, i) => ({
			tableCells: [
				cell(210 + i * 10, "\n"),
				cell(213 + i * 10, "\n"),
				cell(216 + i * 10, "\n"),
			],
		})),
	];
	return {
		body: {
			content: [
				{
					startIndex: 1,
					endIndex: 50,
					paragraph: { elements: [run(1, "Kik vettek részt?\n")] },
				},
				{
					startIndex: 100,
					table: {
						tableRows: [
							{
								tableCells: [
									{
										startIndex: 101,
										content: [
											{
												startIndex: 105,
												table: { tableRows: rows },
											},
										],
									},
									cell(400, "{count}\n"),
								],
							},
						],
					},
				},
			],
		},
	};
}

describe("person rows", () => {
	it("finds the template row inside a nested table", () => {
		const row = findTemplateRow(doc(0));
		expect(row).toMatchObject({ tableStartIndex: 105, rowIndex: 1 });
		expect(findTemplateRow({ body: { content: [] } })).toBeNull();
	});

	it("deletes the row without people and inserts count-1 rows otherwise", () => {
		const row = findTemplateRow(doc(0))!;
		const location = {
			tableStartLocation: { index: 105 },
			rowIndex: 1,
			columnIndex: 0,
		};
		expect(personRowStructureRequests(row, 0)).toEqual([
			{ deleteTableRow: { tableCellLocation: location } },
		]);
		expect(personRowStructureRequests(row, 1)).toEqual([]);
		expect(personRowStructureRequests(row, 3)).toHaveLength(2);
	});

	it("fills inserted rows back to front with the template cell style", () => {
		const row = findTemplateRow(doc(2))!;
		const requests = personRowFillRequests(row, data.people) as {
			insertText?: { location: { index: number }; text: string };
			updateTextStyle?: { textStyle: unknown };
		}[];
		const inserts = requests.flatMap((r) =>
			r.insertText ? [r.insertText] : [],
		);
		expect(inserts).toEqual([
			{ location: { index: 227 }, text: "Nagy Anna" },
			{ location: { index: 221 }, text: "Önkéntes" },
			{ location: { index: 217 }, text: "Kiss Dániel" },
			{ location: { index: 214 }, text: "Példa Zrt." },
			{ location: { index: 211 }, text: "Mentor" },
		]);
		expect(requests[9]).toEqual({
			updateTextStyle: {
				range: { startIndex: 211, endIndex: 217 },
				textStyle: { bold: true },
				fields: "*",
			},
		});
	});

	it("puts the first person into the template row via replaceAllText", () => {
		const requests = replaceRequests({ "{count}": "15" }, data.people[0]);
		expect(requests).toContainEqual({
			replaceAllText: {
				containsText: { text: "{person.name}", matchCase: true },
				replaceText: "Tóth Réka",
			},
		});
		expect(replaceRequests({}, undefined)).toContainEqual({
			replaceAllText: {
				containsText: { text: "{person.role}", matchCase: true },
				replaceText: "",
			},
		});
	});
});
