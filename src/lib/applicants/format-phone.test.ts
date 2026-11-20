import { describe, expect, it } from "vitest";
import { formatPhone } from "./format";

describe("formatPhone", () => {
	it.each([
		["+36301234567", "+36 30 123 4567"],
		["+36 30 123 4567", "+36 30 123 4567"],
		["06301234567", "+36 30 123 4567"],
		["06 30 123 4567", "+36 30 123 4567"],
		["0036 30 123-4567", "+36 30 123 4567"],
		["+36 (20) 333 4455", "+36 20 333 4455"],
		["+3612345678", "+36 1 234 5678"],
		["0612345678", "+36 1 234 5678"],
		["+36 72 123 456", "+36 72 123 456"],
	])("formats %s", (input, expected) => {
		expect(formatPhone(input)).toBe(expected);
	});

	it.each(["+43 660 1234567", "+4930123456", "12345678", "+36 30 12", ""])(
		"leaves %j unchanged",
		(input) => {
			expect(formatPhone(input)).toBe(input);
		},
	);
});
