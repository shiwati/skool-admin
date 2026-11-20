import { describe, expect, it } from "vitest";
import {
	ageRangeText,
	reportDateText,
	reportDayText,
	type ReportDocumentData,
} from "./format";

const data: ReportDocumentData = {
	eventName: "Minecraft workshop",
	companyName: "Robert Bosch Kft.",
	from: new Date("2025-05-16T13:00:00Z"),
	to: new Date("2025-05-16T16:30:00Z"),
	location: "Budapest",
	ageRange: "10-12",
	description: "Rövid leírás",
	participants: 15,
	people: [{ role: "Oktató", organization: "Skool", name: "Jéney Ildikó" }],
	highlightedQuotes: [
		{ text: "Minden <tetszett>!", role: "résztvevő", kind: "PARTICIPANT" },
	],
	quotes: [
		{
			text: "A Bosch nagyon jó hely volt!",
			role: "résztvevő",
			kind: "PARTICIPANT",
		},
		{ text: "Öröm volt mentorálni.", role: "mentor", kind: "MENTOR" },
	],
	metrics: [
		{
			key: "recommend",
			percent: 100,
			phrase: "ajánlaná a workshopot másoknak is",
		},
	],
	recommendPercent: 100,
};

describe("reportDateText", () => {
	it("shows one day with the time range in Budapest time", () => {
		expect(reportDateText(data.from, data.to)).toBe(
			"2025. május 16., 15:00–18:30",
		);
	});

	it("shows a date range for multi-day events", () => {
		expect(
			reportDateText(
				new Date("2025-07-07T08:00:00Z"),
				new Date("2025-07-11T14:00:00Z"),
			),
		).toBe("2025. július 7. – 2025. július 11.");
	});
});

describe("ageText", () => {
	it("formats the age range", () => {
		expect(ageRangeText("10-12")).toBe("10–12");
		expect(ageRangeText(" 14 – 18 ")).toBe("14–18");
		expect(ageRangeText("felnőttek")).toBe("felnőttek");
		expect(ageRangeText(null)).toBeNull();
	});
});

describe("reportDayText", () => {
	it("shows one day or a range", () => {
		expect(reportDayText(data.from, data.to)).toBe("2025. május 16.");
		expect(reportDayText(data.from, new Date("2025-05-18T10:00:00Z"))).toBe(
			"2025. május 16. – 2025. május 18.",
		);
	});
});
