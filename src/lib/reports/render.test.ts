import { describe, expect, it } from "vitest";
import {
	ageText,
	renderReportHtml,
	reportDateText,
	reportFileName,
	type ReportDocumentData,
} from "./render";

const data: ReportDocumentData = {
	eventName: "Minecraft workshop",
	companyName: "Robert Bosch Kft.",
	from: new Date("2025-05-16T13:00:00Z"),
	to: new Date("2025-05-16T16:30:00Z"),
	location: "Budapest",
	ageRange: "10-12",
	participants: 15,
	people: [{ role: "Oktató", organization: "Skool", name: "Jéney Ildikó" }],
	highlightedQuotes: [{ text: "Minden <tetszett>!", role: "résztvevő" }],
	quotes: [{ text: "A Bosch nagyon jó hely volt!", role: "résztvevő" }],
	metrics: [{ percent: 100, phrase: "ajánlaná a workshopot másoknak is" }],
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
		expect(ageText("10-12")).toBe("10–12 évesek");
		expect(ageText(null)).toBeNull();
	});
});

describe("renderReportHtml", () => {
	const html = renderReportHtml(data);

	it("contains the title, people, quotes and metrics", () => {
		expect(html).toContain(
			"Robert Bosch Kft. × Skool workshop – záró riport",
		);
		expect(html).toContain("Jéney Ildikó");
		expect(html).toContain("A Bosch nagyon jó hely volt!");
		expect(html).toContain(
			"A résztvevők <b>100%</b>-a ajánlaná a workshopot másoknak is.",
		);
		expect(html).toContain("Mit csináltunk?");
	});

	it("escapes user text", () => {
		expect(html).toContain("Minden &lt;tetszett&gt;!");
		expect(html).not.toContain("<tetszett>");
	});

	it("leaves out the impact section without metrics", () => {
		expect(renderReportHtml({ ...data, metrics: [] })).not.toContain(
			"A hatás számokban",
		);
	});
});

describe("reportFileName", () => {
	it("adds the start date", () => {
		expect(reportFileName(data)).toBe(
			"Robert Bosch Kft. × Skool workshop – záró riport – 2025. május 16.",
		);
	});
});
