import { describe, expect, it } from "vitest";
import { foodNeeds } from "./food-needs";

const row = (
	status: string,
	id: string,
	foodPreference: string | null,
	deletedAt: Date | null = null,
	lastName = `Név${id}`,
) => ({
	status,
	foodPreference,
	applicant: { id, firstName: "Anna", lastName, deletedAt },
});

describe("foodNeeds", () => {
	it("groups by status in order and leaves out waitlisted, rejected and cancelled", () => {
		const result = foodNeeds([
			row("APPLIED", "1", "dió"),
			row("ATTENDED", "2", "dió"),
			row("ATTENDED", "3", "dió"),
			row("ACCEPTED", "4", "dió"),
			row("WAITLISTED", "5", "dió"),
			row("REJECTED", "6", "dió"),
			row("CANCELLED", "7", "dió"),
		]);
		expect(result.covered).toBe(4);
		expect(result.groups.map((g) => [g.status, g.rows.length])).toEqual([
			["ATTENDED", 2],
			["ACCEPTED", 1],
			["APPLIED", 1],
		]);
	});

	it("lists only applicants with a restriction and counts the others together", () => {
		const result = foodNeeds([
			row("ATTENDED", "1", "laktózmentes"),
			row("ATTENDED", "2", "nincs"),
			row("ACCEPTED", "3", "-"),
			row("APPLIED", "4", null),
			row("APPLIED", "5", "  "),
		]);
		expect(result.unrestricted).toBe(4);
		expect(result.covered).toBe(5);
		expect(result.groups).toEqual([
			{
				status: "ATTENDED",
				rows: [
					{
						applicantId: "1",
						name: "Név1 Anna",
						answer: "laktózmentes",
					},
				],
			},
		]);
	});

	it("sorts a group by answer, ignoring case and accents, then by name", () => {
		const [group] = foodNeeds([
			row("ACCEPTED", "1", "vegetáriánus", null, "Zsolt"),
			row("ACCEPTED", "2", "Laktózmentes", null, "Varga"),
			row("ACCEPTED", "3", "laktozmentes", null, "Balogh"),
			row("ACCEPTED", "4", "gluténmentes", null, "Kiss"),
		]).groups;
		expect(group.rows.map((r) => r.applicantId)).toEqual([
			"4",
			"3",
			"2",
			"1",
		]);
	});

	it("ignores case, accents and punctuation in the no-answers", () => {
		const result = foodNeeds(
			[
				"Nincs",
				"NEM",
				"nincs.",
				"Nincsen!",
				"Nem, nincs",
				"N/A",
				"Nincs érzékenységem",
			].map((answer, i) => row("ACCEPTED", String(i), answer)),
		);
		expect(result.groups).toEqual([]);
		expect(result.unrestricted).toBe(7);
	});

	it("lists an answer that only starts like a no", () => {
		const result = foodNeeds([
			row("ACCEPTED", "1", "nem eszik húst"),
			row("ACCEPTED", "2", "nincs, de a mogyoró igen"),
		]);
		expect(result.unrestricted).toBe(0);
		expect(result.groups[0].rows).toHaveLength(2);
	});

	it("leaves out anonymized applicants", () => {
		const result = foodNeeds([row("ACCEPTED", "1", "dió", new Date())]);
		expect(result).toEqual({ covered: 0, unrestricted: 0, groups: [] });
	});

	it("shows an applicant with several applications once, in the first group", () => {
		const result = foodNeeds([
			row("APPLIED", "1", "glutén"),
			row("ATTENDED", "1", "glutén"),
		]);
		expect(result.covered).toBe(1);
		expect(result.groups.map((g) => g.status)).toEqual(["ATTENDED"]);
	});
});
