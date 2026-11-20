import { describe, expect, it } from "vitest";
import { quoteCandidates } from "./quotes";

describe("quoteCandidates", () => {
	it("lists text answers of the quote questions, participants first", () => {
		const result = quoteCandidates([
			{
				id: "m1",
				role: "MENTOR",
				answers: { highlight: "A lányok lelkesedése volt a legjobb." },
			},
			{
				id: "p1",
				role: "PARTICIPANT",
				answers: {
					feeling: "Nagyon jól éreztem magam!",
					instructorImprove: "Lassabban magyarázzon.",
					favoriteTopic: "ok",
					mentorRating: 5,
				},
			},
		]);
		expect(result.map((c) => [c.id, c.role])).toEqual([
			["p1:feeling", "PARTICIPANT"],
			["m1:highlight", "MENTOR"],
		]);
	});
});
