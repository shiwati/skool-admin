import { describe, expect, it } from "vitest";
import { defaultApplicationMapping, mapHeaders, parseRow } from "./mapping";

const HEADERS = [
	"Időbélyeg",
	"Vezetékneved",
	"Keresztneved",
	"E-mail címed",
	"Melyik iskolába jársz?",
];

describe("mapHeaders with a saved mapping", () => {
	it("matches only the exact header (ignoring case and spacing)", () => {
		const { columns, missingRequired, unmapped } = mapHeaders(HEADERS, {
			lastName: "vezetékneved",
			firstName: "Keresztneved ",
			email: "E-mail  címed",
			schoolName: "Iskola",
		});
		expect(columns).toEqual({ lastName: 1, firstName: 2, email: 3 });
		expect(missingRequired).toEqual([]);
		expect(unmapped).toEqual(["Időbélyeg", "Melyik iskolába jársz?"]);
	});

	it("reports required fields whose header is not in the sheet", () => {
		const { missingRequired } = mapHeaders(HEADERS, {
			lastName: "Vezetékneved",
			firstName: "Utónév",
			email: "E-mail címed",
		});
		expect(missingRequired).toEqual(["firstName"]);
	});

	it("imports the row through the saved mapping", () => {
		const { columns } = mapHeaders(HEADERS, {
			lastName: "Vezetékneved",
			firstName: "Keresztneved",
			email: "E-mail címed",
			hometown: "Melyik iskolába jársz?",
		});
		const parsed = parseRow(
			[46000, "Kiss", "Anna", "Anna@x.hu", "Szeged"],
			columns,
			"Europe/Budapest",
		);
		expect(parsed).toMatchObject({
			ok: true,
			applicant: {
				lastName: "Kiss",
				email: "anna@x.hu",
				hometown: "Szeged",
			},
			application: { receivedAt: null },
		});
	});
});

describe("defaultApplicationMapping", () => {
	it("returns the keyword matches as exact headers", () => {
		expect(
			defaultApplicationMapping([
				"Időbélyeg",
				"Vezetéknév",
				"Keresztnév",
				"E-mail címed",
				"Melyik iskolába jársz?",
			]),
		).toEqual({
			receivedAt: "Időbélyeg",
			lastName: "Vezetéknév",
			firstName: "Keresztnév",
			email: "E-mail címed",
			schoolName: "Melyik iskolába jársz?",
		});
	});
});
