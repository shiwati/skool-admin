import { describe, expect, it } from "vitest";
import {
	AGE_ORDER_MESSAGE,
	CAPACITY_MESSAGE,
	END_BEFORE_START_MESSAGE,
	REQUIRED_MESSAGE,
	SHEET_URL_MESSAGE,
	eventFormSchema,
	toCreateEventInput,
	toEventFormValues,
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
	applicationSheetUrl: "",
	participantFeedbackSheetUrl: "",
	mentorFeedbackSheetUrl: "",
	applicationSheetMapping: null,
	participantFeedbackSheetMapping: null,
	mentorFeedbackSheetMapping: null,
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
		expect(messages({ ...values, applicationSheetUrl: sheet })).toEqual({});
		expect(
			messages({
				...values,
				applicationSheetUrl: "https://example.com/sheet",
			}),
		).toEqual({ applicationSheetUrl: SHEET_URL_MESSAGE });
		expect(
			messages({ ...values, applicationSheetUrl: "nem link" }),
		).toEqual({
			applicationSheetUrl: SHEET_URL_MESSAGE,
		});
	});

	it("normalizes and de-duplicates tags, accepting new ones", () => {
		const parsed = eventFormSchema.parse({
			...values,
			tags: ["  Robotika ", "robotika", "3D  nyomtatás"],
		});
		expect(parsed.tags).toEqual(["robotika", "3d nyomtatás"]);
	});

	it("rejects a tag longer than 30 characters on the tags field", () => {
		expect(messages({ ...values, tags: ["a".repeat(31)] })).toMatchObject({
			"tags.0": "A címke legfeljebb 30 karakter lehet.",
		});
	});
});

describe("toEventFormValues", () => {
	it("keeps every stored tag", () => {
		const form = toEventFormValues({
			id: "e1",
			name: "Python",
			tags: ["robotika", "régi címke"],
			description: null,
			from: "2027-03-06T09:00:00.000Z",
			to: "2027-03-06T13:00:00.000Z",
			companyName: null,
			location: null,
			capacity: 10,
			ageRange: null,
			applicationSheetUrl: null,
			participantFeedbackSheetUrl: null,
			mentorFeedbackSheetUrl: null,
			applicationSheetMapping: null,
			participantFeedbackSheetMapping: null,
			mentorFeedbackSheetMapping: null,
			instructor: null,
			mentors: [],
		});
		expect(form.tags).toEqual(["robotika", "régi címke"]);
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
		expect(input.applicationSheetUrl).toBeUndefined();
	});

	it("passes the sheet link through", () => {
		const applicationSheetUrl =
			"https://docs.google.com/spreadsheets/d/abc123/edit";
		expect(
			toCreateEventInput({ ...values, applicationSheetUrl })
				.applicationSheetUrl,
		).toBe(applicationSheetUrl);
	});
});
