import { describe, expect, it } from "vitest";
import { escapeCsvCell, neutralizeFormula, toCsv } from "./csv";

const BOM = String.fromCharCode(0xfeff);

describe("escapeCsvCell", () => {
	it("leaves plain text alone", () => {
		expect(escapeCsvCell("Kiss Béla")).toBe("Kiss Béla");
	});

	it("quotes delimiters, quotes and line breaks", () => {
		expect(escapeCsvCell("a;b")).toBe('"a;b"');
		expect(escapeCsvCell('mondta: "szia"')).toBe('"mondta: ""szia"""');
		expect(escapeCsvCell("sor1\nsor2")).toBe('"sor1\nsor2"');
	});

	it("does not quote commas (the delimiter is a semicolon)", () => {
		expect(escapeCsvCell("Pécs, Kossuth u. 1.")).toBe(
			"Pécs, Kossuth u. 1.",
		);
	});
});

describe("neutralizeFormula", () => {
	it("defuses formula-like values", () => {
		expect(neutralizeFormula("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
		expect(neutralizeFormula("@cmd")).toBe("'@cmd");
		expect(neutralizeFormula("+cmd|' /C calc'!A0")).toBe(
			"'+cmd|' /C calc'!A0",
		);
		expect(neutralizeFormula("-2+3+cmd")).toBe("'-2+3+cmd");
		expect(neutralizeFormula("\tx")).toBe("'\tx");
	});

	it("keeps phone numbers and plain negatives intact", () => {
		expect(neutralizeFormula("+36 30 123 4567")).toBe("+36 30 123 4567");
		expect(neutralizeFormula("+36 (1) 234-5678")).toBe("+36 (1) 234-5678");
		expect(neutralizeFormula("-5")).toBe("-5");
	});
});

describe("toCsv", () => {
	it("writes BOM, semicolons and CRLF", () => {
		expect(toCsv(["A", "B"], [["1", "x;y"]])).toBe(
			`${BOM}A;B\r\n1;"x;y"\r\n`,
		);
	});

	it("writes only the header for no rows", () => {
		expect(toCsv(["A"], [])).toBe(`${BOM}A\r\n`);
	});
});
