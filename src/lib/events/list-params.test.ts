import { describe, expect, it } from "vitest";
import {
	DEFAULT_EVENT_LIST_STATE,
	parseEventListState,
	toEventSearchParams,
	toEventsApiQuery,
	updateEventListState,
} from "./list-params";

const parse = (qs: string) => parseEventListState(new URLSearchParams(qs));

describe("event list URL state", () => {
	it("defaults to the all tab, newest first", () => {
		expect(parse("")).toEqual(DEFAULT_EVENT_LIST_STATE);
		expect(toEventSearchParams(DEFAULT_EVENT_LIST_STATE).toString()).toBe(
			"",
		);
	});

	it("round-trips filters and drops invalid values", () => {
		const state = parse(
			`tab=closed&q=python&tags=robotika&tags=${"x".repeat(31)}&tags=Robotika&place=Pécs&year=2025&sort=name&page=3&pageSize=50&instructor=Béla`,
		);
		expect(state).toMatchObject({
			tab: "closed",
			q: "python",
			tags: ["robotika"],
			place: "Pécs",
			instructor: "Béla",
			year: 2025,
			sort: "name",
			order: "asc",
			page: 3,
			pageSize: 50,
		});
		expect(parseEventListState(toEventSearchParams(state))).toEqual(state);

		expect(parse("tab=x&sort=y&page=-1&pageSize=7&year=1")).toEqual(
			DEFAULT_EVENT_LIST_STATE,
		);
	});

	it("resets the page on any change but paging", () => {
		const state = { ...DEFAULT_EVENT_LIST_STATE, page: 4 };
		expect(updateEventListState(state, { page: 5 }).page).toBe(5);
		expect(updateEventListState(state, { tab: "closed" }).page).toBe(1);
	});

	it("maps the tab to the API phase", () => {
		expect(toEventsApiQuery(parse("")).has("phase")).toBe(false);
		expect(toEventsApiQuery(parse("tab=planned")).get("phase")).toBe(
			"planned",
		);
	});
});
