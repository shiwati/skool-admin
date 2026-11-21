import { describe, expect, it } from "vitest";
import {
	DEFAULT_APPLICATIONS_VIEW,
	parseApplicationsParams,
	toApplicationsApiQuery,
	toApplicationsSearchParams,
	updateApplicationsView,
	type ApplicationsView,
} from "./applications-params";

const parse = (query: string) =>
	parseApplicationsParams(new URLSearchParams(query));

describe("parseApplicationsParams", () => {
	it("returns the default view for an empty query", () => {
		expect(parse("")).toEqual(DEFAULT_APPLICATIONS_VIEW);
	});

	it("reads every parameter", () => {
		expect(
			parse("status=WAITLISTED&sort=age&order=desc&page=2&pageSize=50"),
		).toEqual({
			status: "WAITLISTED",
			sort: "age",
			order: "desc",
			page: 2,
			pageSize: 50,
		});
	});

	it("falls back to the default for invalid values", () => {
		expect(
			parse("status=FOO&sort=bar&order=up&page=0&pageSize=30"),
		).toEqual(DEFAULT_APPLICATIONS_VIEW);
		expect(parse("page=abc&pageSize=-1").page).toBe(1);
	});
});

describe("toApplicationsSearchParams", () => {
	it("leaves default values out", () => {
		expect(
			toApplicationsSearchParams(DEFAULT_APPLICATIONS_VIEW).toString(),
		).toBe("");
	});

	it("round-trips a non-default view", () => {
		const view: ApplicationsView = {
			status: "ACCEPTED",
			sort: "name",
			order: "desc",
			page: 3,
			pageSize: 100,
		};
		expect(
			parseApplicationsParams(toApplicationsSearchParams(view)),
		).toEqual(view);
	});

	it("serializes a partial view, e.g. a status link", () => {
		expect(
			toApplicationsSearchParams({ status: "WAITLISTED" }).toString(),
		).toBe("status=WAITLISTED");
	});
});

describe("toApplicationsApiQuery", () => {
	it("maps the default view to the API's keys", () => {
		expect(
			Object.fromEntries(
				toApplicationsApiQuery(DEFAULT_APPLICATIONS_VIEW),
			),
		).toEqual({
			sort: "receivedAt",
			order: "asc",
			page: "1",
			pageSize: "25",
		});
	});

	it("sorts by age as youngest first: birth year descending", () => {
		const view = { ...DEFAULT_APPLICATIONS_VIEW, sort: "age" as const };
		const asc = toApplicationsApiQuery({ ...view, order: "asc" });
		expect(asc.get("sort")).toBe("birthYear");
		expect(asc.get("order")).toBe("desc");
		expect(
			toApplicationsApiQuery({ ...view, order: "desc" }).get("order"),
		).toBe("asc");
	});

	it("maps name to last name and keeps the status filter", () => {
		const query = toApplicationsApiQuery(
			{ ...DEFAULT_APPLICATIONS_VIEW, sort: "name", status: "REJECTED" },
			{ page: 4, pageSize: 100 },
		);
		expect(Object.fromEntries(query)).toEqual({
			sort: "lastName",
			order: "asc",
			page: "4",
			pageSize: "100",
			status: "REJECTED",
		});
	});
});

describe("updateApplicationsView", () => {
	const onPage3 = { ...DEFAULT_APPLICATIONS_VIEW, page: 3 };

	it("returns to page 1 on a status, sort or page size change", () => {
		expect(
			updateApplicationsView(onPage3, { status: "ACCEPTED" }).page,
		).toBe(1);
		expect(
			updateApplicationsView(onPage3, { sort: "name", order: "asc" })
				.page,
		).toBe(1);
		expect(updateApplicationsView(onPage3, { pageSize: 50 }).page).toBe(1);
	});

	it("keeps the page when only the page changes", () => {
		expect(updateApplicationsView(onPage3, { page: 4 }).page).toBe(4);
	});
});
