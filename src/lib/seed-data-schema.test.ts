// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dataFileSchema } from "./seed-data-schema";

const base = {
	events: [
		{
			id: "e1",
			name: "Esemény",
			from: "2026-03-14T08:00:00Z",
			to: "2026-03-15T16:00:00Z",
		},
	],
	applicants: [{ id: "a1", firstName: "Bence", lastName: "Kovács" }],
	applications: [{ id: "p1", eventId: "e1", applicantId: "a1" }],
};

describe("dataFileSchema", () => {
	it("accepts the committed sample file", () => {
		const raw = readFileSync(
			path.resolve(process.cwd(), "prisma/seed-data/sample.json"),
			"utf8",
		);
		expect(dataFileSchema.safeParse(JSON.parse(raw)).success).toBe(true);
	});

	it("applies defaults", () => {
		const parsed = dataFileSchema.parse(base);
		expect(parsed.applications[0].status).toBe("APPLIED");
		expect(parsed.events[0].capacity).toBe(0);
		expect(parsed.applicants[0].newsletter).toBe(false);
	});

	it("defaults event tags to an empty list", () => {
		expect(dataFileSchema.parse(base).events[0].tags).toEqual([]);
	});

	it("accepts any well-formed tag and stores it normalized", () => {
		const parsed = dataFileSchema.parse({
			...base,
			events: [
				{
					...base.events[0],
					tags: ["robotika", "  3D Nyomtatás ", "Robotika"],
				},
			],
		});
		expect(parsed.events[0].tags).toEqual(["robotika", "3d nyomtatás"]);
	});

	it("rejects a malformed tag", () => {
		const result = dataFileSchema.safeParse({
			...base,
			events: [{ ...base.events[0], tags: ["a,b"] }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an application pointing at an unknown event", () => {
		const result = dataFileSchema.safeParse({
			...base,
			applications: [{ id: "p1", eventId: "nope", applicantId: "a1" }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a duplicate (event, applicant) pair", () => {
		const result = dataFileSchema.safeParse({
			...base,
			applications: [
				...base.applications,
				{ id: "p2", eventId: "e1", applicantId: "a1" },
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects duplicate ids", () => {
		const result = dataFileSchema.safeParse({
			...base,
			applicants: [...base.applicants, ...base.applicants],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an unknown status", () => {
		const result = dataFileSchema.safeParse({
			...base,
			applications: [
				{ id: "p1", eventId: "e1", applicantId: "a1", status: "MAYBE" },
			],
		});
		expect(result.success).toBe(false);
	});
});
