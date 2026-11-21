import { describe, expect, it } from "vitest";
import { DEFAULT_APPLICATIONS_VIEW } from "./applications-params";
import { eventApplicantsHref } from "./links";

describe("eventApplicantsHref", () => {
	it("links to the tab without a query by default", () => {
		expect(eventApplicantsHref("e1")).toBe("/events/e1/applicants");
		expect(eventApplicantsHref("e1", DEFAULT_APPLICATIONS_VIEW)).toBe(
			"/events/e1/applicants",
		);
	});

	it("appends a status filter", () => {
		expect(eventApplicantsHref("e1", { status: "WAITLISTED" })).toBe(
			"/events/e1/applicants?status=WAITLISTED",
		);
	});

	it("encodes the program id", () => {
		expect(eventApplicantsHref("a/b")).toBe("/events/a%2Fb/applicants");
	});
});
