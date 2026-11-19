import { describe, expect, it } from "vitest";
import {
	AGE_ORDER_MESSAGE,
	CAPACITY_MESSAGE,
	END_BEFORE_START_MESSAGE,
	REQUIRED_MESSAGE,
	SHEET_URL_MESSAGE,
	eventFormSchema,
	toCreateEventInput,
	type EventFormValues,
} from "./schema";

const values: EventFormValues = {
	name: " Python alapok ",
	tags: ["robotika"],
	description: "",
	from: "2027-03-06T10:00",
	to: "2027-03-06T14:00",
	companyName: "",
	location: "",
	capacity: "24",
	ageFrom: "12",
	ageTo: "18",
	sheetUrl: "",
	feedbackSheetUrl: "",
	instructor: "",
	mentors: [],
};

const messages = (input: EventFormValues) => {
	const result = eventFormSchema.safeParse(input);
	return result.success
		? {}
		: Object.fromEntries(
				[...result.error.issues]
					.reverse()
					.map((i) => [i.path.join("."), i.message]),
			);
};

describe("eventFormSchema", () => {
	it("accepts a complete form and trims text", () => {
		const result = eventFormSchema.safeParse(values);
		expect(result.success && result.data.name).toBe("Python alapok");
	});

	it("requires name, dates and capacity", () => {
		expect(
			messages({ ...values, name: "", from: "", to: "", capacity: "" }),
		).toEqual({
			name: REQUIRED_MESSAGE,
			from: REQUIRED_MESSAGE,
			to: REQUIRED_MESSAGE,
			capacity: REQUIRED_MESSAGE,
		});
	});

	it("rejects an end before the start, allows equal times", () => {
		expect(messages({ ...values, to: "2027-03-06T09:59" })).toEqual({
			to: END_BEFORE_START_MESSAGE,
		});
		expect(messages({ ...values, to: values.from })).toEqual({});
	});

	it("requires a capacity of at least 1", () => {
		expect(messages({ ...values, capacity: "0" })).toEqual({
			capacity: CAPACITY_MESSAGE,
		});
		expect(messages({ ...values, capacity: "1.5" })).toEqual({
			capacity: CAPACITY_MESSAGE,
		});
	});

	it("rejects a reversed age range", () => {
		expect(messages({ ...values, ageFrom: "18", ageTo: "12" })).toEqual({
			ageTo: AGE_ORDER_MESSAGE,
		});
	});

	it("accepts an empty or Google Sheets link, rejects anything else", () => {
		const sheet =
			"https://docs.google.com/spreadsheets/d/13alVrAZOW7rpKmcAsOkhpdVzln5dT-lKXm41N-fCwuw/edit?resourcekey=&gid=1961583770#gid=1961583770";
		expect(messages({ ...values, sheetUrl: sheet })).toEqual({});
		expect(
			messages({ ...values, sheetUrl: "https://example.com/sheet" }),
		).toEqual({ sheetUrl: SHEET_URL_MESSAGE });
		expect(messages({ ...values, sheetUrl: "nem link" })).toEqual({
			sheetUrl: SHEET_URL_MESSAGE,
		});
	});
});

describe("toCreateEventInput", () => {
	it("converts local times to ISO instants and builds the age range", () => {
		const input = toCreateEventInput(values);
		expect(input.from).toBe(new Date("2027-03-06T10:00").toISOString());
		expect(input.to).toBe(new Date("2027-03-06T14:00").toISOString());
		expect(input.capacity).toBe(24);
		expect(input.ageRange).toBe("12-18");
	});

	it("omits empty optional fields and a half-filled age range", () => {
		const input = toCreateEventInput({ ...values, ageTo: "" });
		expect(input.ageRange).toBeUndefined();
		expect(input.description).toBeUndefined();
		expect(input.companyName).toBeUndefined();
		expect(input.instructor).toBeUndefined();
		expect(input.sheetUrl).toBeUndefined();
	});

	it("passes the sheet link through", () => {
		const sheetUrl = "https://docs.google.com/spreadsheets/d/abc123/edit";
		expect(toCreateEventInput({ ...values, sheetUrl }).sheetUrl).toBe(
			sheetUrl,
		);
	});
});
