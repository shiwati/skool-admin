// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { application: { findMany } } }));

import { getFoodNeeds } from "./food-needs-load";

const person = (id: string, firstName: string, lastName: string) => ({
	id,
	firstName,
	lastName,
	deletedAt: null,
});

describe("getFoodNeeds", () => {
	beforeEach(() => vi.resetAllMocks());

	it("reads only the four covered statuses of the program", async () => {
		findMany.mockResolvedValue([]);
		await getFoodNeeds("e1");
		expect(findMany.mock.calls[0][0].where).toEqual({
			eventId: "e1",
			status: { in: ["ATTENDED", "ACCEPTED", "APPLIED"] },
		});
	});

	it("groups what it reads", async () => {
		findMany.mockResolvedValue([
			{
				status: "ACCEPTED",
				foodPreference: "glutén",
				applicant: person("p1", "Anna", "Kiss"),
			},
			{
				status: "ACCEPTED",
				foodPreference: "nincs",
				applicant: person("p2", "Béla", "Nagy"),
			},
		]);
		const result = await getFoodNeeds("e1");
		expect(result.unrestricted).toBe(1);
		expect(result.groups[0].rows).toEqual([
			{ applicantId: "p1", name: "Kiss Anna", answer: "glutén" },
		]);
	});
});
