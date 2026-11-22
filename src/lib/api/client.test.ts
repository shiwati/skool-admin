import { describe, expect, it } from "vitest";
import { ApiError, apiErrorMessage, jsonInit } from "./client";

describe("apiErrorMessage", () => {
	it("shows the server's message", () => {
		const error = new ApiError(422, {
			error: "A sheet nem érhető el.",
			code: "SHEET_NOT_ACCESSIBLE",
		});
		expect(apiErrorMessage(error, "Hiba")).toBe("A sheet nem érhető el.");
	});

	it("hides the opaque 500 message", () => {
		const error = new ApiError(500, { error: "Internal Server Error" });
		expect(apiErrorMessage(error, "Hiba")).toBe("Hiba");
	});

	it("falls back without a message or for other errors", () => {
		expect(apiErrorMessage(new ApiError(404), "Hiba")).toBe("Hiba");
		expect(apiErrorMessage(new TypeError("offline"), "Hiba")).toBe("Hiba");
	});
});

describe("jsonInit", () => {
	it("builds a JSON request", () => {
		expect(jsonInit("PATCH", { a: 1 })).toEqual({
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: '{"a":1}',
		});
	});
});
