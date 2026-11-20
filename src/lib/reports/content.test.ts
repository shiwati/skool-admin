import { describe, expect, it } from "vitest";
import {
	defaultReportContent,
	parseStoredContent,
	reportContentSchema,
} from "./content";

const quote = (n: number, highlighted = false) => ({
	feedbackId: `f${n}`,
	questionKey: "feeling",
	text: "Nagyon jó volt!",
	highlighted,
});

describe("reportContentSchema", () => {
	it("accepts valid content", () => {
		expect(
			reportContentSchema.safeParse({
				people: [
					{ role: "Oktató", organization: "Skool", name: "Anna" },
				],
				quotes: [quote(1, true), quote(2, true)],
				disabledMetrics: ["recommend"],
			}).success,
		).toBe(true);
	});

	it("rejects more than 8 quotes, more than 2 highlights and duplicates", () => {
		const base = { people: [], disabledMetrics: [] };
		expect(
			reportContentSchema.safeParse({
				...base,
				quotes: Array.from({ length: 9 }, (_, i) => quote(i)),
			}).success,
		).toBe(false);
		expect(
			reportContentSchema.safeParse({
				...base,
				quotes: [quote(1, true), quote(2, true), quote(3, true)],
			}).success,
		).toBe(false);
		expect(
			reportContentSchema.safeParse({
				...base,
				quotes: [quote(1), quote(1)],
			}).success,
		).toBe(false);
	});

	it("rejects people without role or name", () => {
		expect(
			reportContentSchema.safeParse({
				people: [{ role: " ", organization: "", name: "Anna" }],
				quotes: [],
				disabledMetrics: [],
			}).success,
		).toBe(false);
	});
});

describe("defaultReportContent", () => {
	it("pre-fills the instructor and the mentors", () => {
		expect(
			defaultReportContent({
				instructor: "Jéney Ildikó",
				mentors: ["Senyei Rita", " "],
				companyName: "Robert Bosch Kft.",
			}).people,
		).toEqual([
			{ role: "Oktató", organization: "Skool", name: "Jéney Ildikó" },
			{
				role: "Mentor",
				organization: "Robert Bosch Kft.",
				name: "Senyei Rita",
			},
		]);
	});
});

describe("parseStoredContent", () => {
	it("falls back on broken content", () => {
		const fallback = { people: [], quotes: [], disabledMetrics: [] };
		expect(parseStoredContent({ people: "x" }, fallback)).toBe(fallback);
	});
});
