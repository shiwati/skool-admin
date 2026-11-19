import { describe, expect, it } from "vitest";
import { comparisonRows } from "./duplicate-comparison";
import type { DuplicateApplicant } from "./types";

const base: DuplicateApplicant = {
	id: "a",
	createdAt: "2026-10-14T16:02:00.000Z",
	firstName: "Boróka",
	lastName: "Kiss",
	birthYear: 2013,
	schoolName: "Budaörsi Ált. Isk.",
	hometown: null,
	phoneNumber: "+36 30 123 4567",
	email: "kiss.bori@freemail.hu",
	parentFirstName: "Ádám",
	parentLastName: "Kiss",
	parentMothersName: null,
	parentAddress: null,
	parentEmail: null,
	parentPhone: null,
	newsletter: false,
	applications: [
		{
			id: "app1",
			receivedAt: "2026-10-14T16:02:00.000Z",
			status: "ACCEPTED",
			event: { id: "e1", name: "Robotika tábor" },
		},
	],
};

describe("comparisonRows", () => {
	it("flags only differing fields", () => {
		const rows = comparisonRows(base, {
			...base,
			id: "b",
			phoneNumber: "+36 20 987 6543",
		});
		const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
		expect(byLabel["Név"]).toMatchObject({
			a: "Kiss Boróka",
			differs: false,
		});
		expect(byLabel["Telefon"].differs).toBe(true);
		expect(byLabel["Település"]).toMatchObject({ a: "—", differs: false });
		expect(byLabel["Programok"].a).toBe("Robotika tábor (Elfogadva)");
		expect(byLabel["Szülő neve"].a).toBe("Kiss Ádám");
	});
});
