import { describe, expect, it } from "vitest";
import {
	applicationSheetMappingSchema,
	feedbackSheetMappingSchema,
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

	it("falls back to the default for invalid stored values", () => {
		expect(readFeedbackMapping("MENTOR", { columns: {} })).toBeNull();
		expect(readFeedbackMapping("MENTOR", null)).toBeNull();
	});
});
