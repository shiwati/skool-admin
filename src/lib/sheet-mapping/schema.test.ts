import { describe, expect, it } from "vitest";
import {
	applicationSheetMappingSchema,
	feedbackSheetMappingSchema,
	readApplicationMapping,
	readFeedbackMapping,
} from "./schema";

const messages = (result: {
	success: boolean;
	error?: { issues: { message: string }[] };
}) => result.error?.issues.map((i) => i.message) ?? [];

describe("applicationSheetMappingSchema", () => {
	it("trims headers and drops empty ones", () => {
		expect(
			applicationSheetMappingSchema.parse({
				lastName: " Vezetéknév ",
				firstName: "Keresztnév",
				email: "E-mail",
				schoolName: "",
			}),
		).toEqual({
			lastName: "Vezetéknév",
			firstName: "Keresztnév",
			email: "E-mail",
		});
	});

	it("requires the name and email fields and rejects unknown fields", () => {
		const result = applicationSheetMappingSchema.safeParse({
			lastName: "Vezetéknév",
			shoeSize: "Cipőméret",
		});
		expect(messages(result)).toEqual([
			"Ismeretlen mező: shoeSize.",
			"Kötelező mezőhöz nincs oszlop rendelve: Keresztnév, E-mail.",
		]);
	});
});

describe("readApplicationMapping", () => {
	it("returns a valid stored mapping and ignores an invalid one", () => {
		const mapping = {
			lastName: "Vezetéknév",
			firstName: "Keresztnév",
			email: "Elérhetőség",
		};
		expect(readApplicationMapping(mapping)).toEqual(mapping);
		expect(readApplicationMapping({ lastName: "Vezetéknév" })).toBeNull();
		expect(readApplicationMapping("nonsense")).toBeNull();
		expect(readApplicationMapping(null)).toBeNull();
	});

	it("rejects saving without an e-mail header", () => {
		const result = applicationSheetMappingSchema.safeParse({
			lastName: "Vezetéknév",
			firstName: "Keresztnév",
			email: "  ",
		});
		expect(messages(result)).toEqual([
			"Kötelező mezőhöz nincs oszlop rendelve: E-mail.",
		]);
	});
});

describe("feedbackSheetMappingSchema", () => {
	const valid = {
		columns: { timestamp: "Időbélyeg", overallRating: "Összesen" },
		custom: [],
	};

	it("accepts a mapping with the required questions", () => {
		expect(
			feedbackSheetMappingSchema("MENTOR").safeParse(valid).success,
		).toBe(true);
	});

	it("requires the timestamp and required questions", () => {
		const result = feedbackSheetMappingSchema("PARTICIPANT").safeParse({
			columns: {},
			custom: [],
		});
		expect(messages(result)).toEqual([
			"Kötelező mezőhöz nincs oszlop rendelve: Időbélyeg, Mentorok segítőkészsége, Oktató érthetősége.",
		]);
	});

	it("rejects a custom question named like a catalog question", () => {
		const result = feedbackSheetMappingSchema("PARTICIPANT").safeParse({
			columns: {
				timestamp: "Időbélyeg",
				mentorRating: "M",
				instructorRating: "O",
			},
			custom: [
				{ label: " ajánlaná másoknak ", kind: "text", header: "X" },
			],
		});
		expect(messages(result)).toContain(
			"Az egyéni kérdés neve ütközik egy meglévő kérdéssel.",
		);
	});

	it("validates custom questions", () => {
		const result = feedbackSheetMappingSchema("MENTOR").safeParse({
			...valid,
			custom: [
				{ label: "Pizza", kind: "text", header: "" },
				{ label: "Pizza", kind: "text", header: "P" },
			],
		});
		expect(messages(result)).toEqual([
			"Két egyéni kérdésnek nem lehet ugyanaz a neve.",
			"Minden egyéni kérdéshez válassz oszlopot.",
		]);
	});

	it("rejects unknown question keys and unnamed custom questions", () => {
		const result = feedbackSheetMappingSchema("MENTOR").safeParse({
			columns: { ...valid.columns, shoeSize: "Cipő" },
			custom: [{ label: " ", kind: "scale", header: "H" }],
		});
		expect(messages(result)).toEqual([
			"Ismeretlen kérdés: shoeSize.",
			"Minden egyéni kérdésnek adj nevet.",
		]);
	});

	it("allows at most 50 custom questions", () => {
		const custom = Array.from({ length: 51 }, (_, i) => ({
			label: `K${i}`,
			kind: "text",
			header: `H${i}`,
		}));
		expect(
			feedbackSheetMappingSchema("MENTOR").safeParse({ ...valid, custom })
				.success,
		).toBe(false);
	});

	it("trims headers and labels and drops empty columns", () => {
		expect(
			feedbackSheetMappingSchema("MENTOR").parse({
				columns: {
					timestamp: " Időbélyeg ",
					overallRating: "Összesen",
					highlight: "",
				},
				custom: [{ label: " Pizza ", kind: "choice", header: " P " }],
			}),
		).toEqual({
			columns: { timestamp: "Időbélyeg", overallRating: "Összesen" },
			custom: [{ label: "Pizza", kind: "choice", header: "P" }],
		});
	});

	it("ignores a stored mapping without the timestamp", () => {
		expect(
			readFeedbackMapping("MENTOR", {
				columns: { overallRating: "Összesen" },
				custom: [],
			}),
		).toBeNull();
		expect(readFeedbackMapping("MENTOR", valid)).toEqual(valid);
	});

	it("falls back to the default for invalid stored values", () => {
		expect(readFeedbackMapping("MENTOR", { columns: {} })).toBeNull();
		expect(readFeedbackMapping("MENTOR", null)).toBeNull();
	});
});
