import { describe, expect, it } from "vitest";
import {
	applicantEditRequestSchema,
	applicantEditSchema,
	EMAIL_MESSAGE,
	PHONE_MESSAGE,
	toApplicantFormValues,
	toApplicantUpdate,
	type ApplicantEditValues,
} from "./edit-schema";

const valid: ApplicantEditValues = {
	lastName: "Nagy",
	firstName: "Luca",
	birthYear: "2010",
	email: "nagy.luca@gmail.com",
	phoneNumber: "+36 30 555 1234",
	schoolName: "",
	hometown: "Budapest",
	parentLastName: "",
	parentFirstName: "",
	parentMothersName: "",
	parentAddress: "",
	parentEmail: "",
	parentPhone: "",
	newsletter: true,
};

const errorsOf = (values: Partial<ApplicantEditValues>) => {
	const result = applicantEditSchema.safeParse({ ...valid, ...values });
	return result.success ? {} : result.error.flatten().fieldErrors;
};

describe("applicantEditSchema", () => {
	it("accepts valid values and trims text", () => {
		const parsed = applicantEditSchema.parse({
			...valid,
			lastName: "  Nagy ",
			hometown: " Budapest ",
		});
		expect(parsed.lastName).toBe("Nagy");
		expect(parsed.hometown).toBe("Budapest");
	});

	it("requires last name, first name and e-mail", () => {
		const errors = errorsOf({ lastName: " ", firstName: "", email: "" });
		expect(errors.lastName).toEqual(["Kötelező mező"]);
		expect(errors.firstName).toEqual(["Kötelező mező"]);
		expect(errors.email).toEqual(["Kötelező mező"]);
	});

	it("rejects e-mails without a domain ending (spec scenario)", () => {
		expect(errorsOf({ email: "nagy.luca@gmail" }).email).toEqual([
			EMAIL_MESSAGE,
		]);
		expect(errorsOf({ parentEmail: "x@" }).parentEmail).toEqual([
			EMAIL_MESSAGE,
		]);
		expect(errorsOf({ parentEmail: "" }).parentEmail).toBeUndefined();
	});

	it("checks the birth year range", () => {
		const year = new Date().getFullYear();
		expect(errorsOf({ birthYear: "1900" }).birthYear).toBeUndefined();
		expect(errorsOf({ birthYear: String(year) }).birthYear).toBeUndefined();
		expect(errorsOf({ birthYear: "1899" }).birthYear).toHaveLength(1);
		expect(
			errorsOf({ birthYear: String(year + 1) }).birthYear,
		).toHaveLength(1);
		expect(errorsOf({ birthYear: "20x0" }).birthYear).toHaveLength(1);
		expect(errorsOf({ birthYear: "" }).birthYear).toBeUndefined();
	});

	it("checks phone numbers", () => {
		for (const ok of ["+36 30 555 1234", "(06) 1-234-5678", "123456", ""]) {
			expect(errorsOf({ phoneNumber: ok }).phoneNumber).toBeUndefined();
		}
		for (const bad of ["12345", "+36 30 abc", "1".repeat(21)]) {
			expect(errorsOf({ parentPhone: bad }).parentPhone).toEqual([
				PHONE_MESSAGE,
			]);
		}
	});

	it("limits text length", () => {
		expect(
			errorsOf({ schoolName: "x".repeat(201) }).schoolName,
		).toHaveLength(1);
	});

	it("requires the loaded modification time in requests", () => {
		expect(applicantEditRequestSchema.safeParse(valid).success).toBe(false);
		expect(
			applicantEditRequestSchema.safeParse({
				...valid,
				expectedUpdatedAt: "2026-11-19T10:00:00.000Z",
			}).success,
		).toBe(true);
	});
});

describe("conversion", () => {
	it("stores empty optional values as null and the birth year as a number", () => {
		const update = toApplicantUpdate(applicantEditSchema.parse(valid));
		expect(update).toMatchObject({
			birthYear: 2010,
			schoolName: null,
			parentEmail: null,
			phoneNumber: "+36 30 555 1234",
			newsletter: true,
		});
		expect(
			toApplicantUpdate({ ...valid, birthYear: "" }).birthYear,
		).toBeNull();
	});

	it("round-trips through the form values", () => {
		const update = toApplicantUpdate(valid);
		expect(toApplicantFormValues(update)).toEqual(valid);
		expect(
			toApplicantFormValues({ ...update, email: null, birthYear: null }),
		).toMatchObject({ email: "", birthYear: "" });
	});
});
