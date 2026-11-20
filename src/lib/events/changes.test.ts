import { describe, expect, it } from "vitest";
import { diffEvent } from "./changes";

const current = {
	name: "Python alapok",
	from: new Date("2027-03-06T10:00:00Z"),
	to: new Date("2027-03-06T14:00:00Z"),
	companyName: "Sigma",
	location: null,
	description: null,
	tags: ["robotika"],
	applicationSheetUrl: null,
	participantFeedbackSheetUrl: null,
	mentorFeedbackSheetUrl: null,
	ageRange: "12-18",
	instructor: null,
	mentors: [],
	capacity: 24,
};

describe("diffEvent", () => {
	it("returns nothing when the values are equal or not sent", () => {
		expect(
			diffEvent(current, {
				name: "Python alapok",
				from: new Date("2027-03-06T10:00:00Z"),
				tags: ["robotika"],
				capacity: 24,
				location: null,
			}),
		).toEqual([]);
		expect(diffEvent(current, {})).toEqual([]);
	});

	it("lists changed fields with serialized old and new values", () => {
		expect(
			diffEvent(current, {
				name: "Python haladó",
				to: new Date("2027-03-06T15:00:00Z"),
				companyName: null,
				tags: ["robotika", "kezdő"],
				mentors: ["Szűcs Petra"],
				capacity: 30,
			}),
		).toEqual([
			{
				fieldName: "name",
				oldValue: "Python alapok",
				newValue: "Python haladó",
			},
			{
				fieldName: "to",
				oldValue: "2027-03-06T14:00:00.000Z",
				newValue: "2027-03-06T15:00:00.000Z",
			},
			{ fieldName: "companyName", oldValue: "Sigma", newValue: null },
			{
				fieldName: "tags",
				oldValue: '["robotika"]',
				newValue: '["robotika","kezdő"]',
			},
			{
				fieldName: "mentors",
				oldValue: null,
				newValue: '["Szűcs Petra"]',
			},
			{ fieldName: "capacity", oldValue: "24", newValue: "30" },
		]);
	});
});
