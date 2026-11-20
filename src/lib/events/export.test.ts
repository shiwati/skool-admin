import { describe, expect, it } from "vitest";
import { buildEventsCsv, type ExportableEvent } from "./export";
import { DEFAULT_EVENT_LIST_STATE, toEventsApiQuery } from "./list-params";

const NOW = new Date("2026-11-20T10:00:00Z");

const event: ExportableEvent = {
	name: "Robotika tábor",
	from: "2026-12-01T00:00:00Z",
	to: "2026-12-05T00:00:00Z",
	companyName: "Acme Kft.",
	location: "Pécs",
	applicationSheetUrl: "https://example.com/sheet",
	instructor: "Nagy Péter",
	mentors: ["Szabó Anna"],
	tags: ["robotika", "tábor"],
	capacity: 20,
	applicationCounts: { total: 25 },
};

describe("buildEventsCsv", () => {
	it("exports the table columns with readable values", () => {
		const [header, row] = buildEventsCsv([event], NOW)
			.replace(String.fromCharCode(0xfeff), "")
			.trimEnd()
			.split("\r\n");
		expect(header).toBe(
			"Program;Címkék;Kezdés;Befejezés;Helyszín;Partnercég;Kapacitás;Jelentkezők;Oktatók;Státusz",
		);
		expect(row).toBe(
			"Robotika tábor;robotika, tábor;2026.12.01;2026.12.05;Pécs;Acme Kft.;20;25;Nagy Péter, Szabó Anna;Betelt",
		);
	});
});

describe("toEventsApiQuery", () => {
	it("maps the tab and filters, overriding the paging", () => {
		const params = toEventsApiQuery(
			{
				...DEFAULT_EVENT_LIST_STATE,
				tab: "closed",
				q: "python",
				tags: ["robotika"],
				year: 2025,
				page: 3,
			},
			{ page: 1, pageSize: 100 },
		);
		expect(params.get("phase")).toBe("closed");
		expect(params.get("q")).toBe("python");
		expect(params.getAll("tags")).toEqual(["robotika"]);
		expect(params.get("year")).toBe("2025");
		expect(params.get("page")).toBe("1");
		expect(params.get("pageSize")).toBe("100");
	});

	it("omits the phase on the all tab", () => {
		expect(toEventsApiQuery(DEFAULT_EVENT_LIST_STATE).has("phase")).toBe(
			false,
		);
	});
});
