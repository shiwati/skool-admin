import { describe, expect, it } from "vitest";
import { computeMetrics, metricSentence } from "./metrics";

const metric = (key: string, inputs: Parameters<typeof computeMetrics>[0]) =>
	computeMetrics(inputs).find((m) => m.key === key)!;

describe("computeMetrics", () => {
	it("counts 4–5 answers among those who answered", () => {
		const result = metric("mentorRating", [
			{ answers: { mentorRating: 5 }, recommend: null },
			{ answers: { mentorRating: 4 }, recommend: null },
			{ answers: { mentorRating: 3 }, recommend: null },
			{ answers: {}, recommend: null },
		]);
		expect(result.answered).toBe(3);
		expect(result.percent).toBe(67);
	});

	it("counts 1–2 as positive for reversed statements", () => {
		const result = metric("s07ProgrammingScary", [
			{ answers: { s07ProgrammingScary: 1 }, recommend: null },
			{ answers: { s07ProgrammingScary: 5 }, recommend: null },
		]);
		expect(result.percent).toBe(50);
	});

	it("uses the yes share for recommendation", () => {
		const result = metric("recommend", [
			{ answers: {}, recommend: "yes" },
			{ answers: {}, recommend: "maybe" },
			{ answers: {}, recommend: null },
		]);
		expect(result).toMatchObject({ answered: 2, percent: 50 });
	});

	it("returns null when nobody answered", () => {
		const result = metric("s08CanLearnProgramming", [
			{ answers: { s08CanLearnProgramming: "x" }, recommend: null },
		]);
		expect(result).toMatchObject({ answered: 0, percent: null });
	});
});

describe("metricSentence", () => {
	it("builds the Hungarian sentence", () => {
		expect(
			metricSentence({
				percent: 90,
				phrase: "szerint Skooleenak lenni menő",
			}),
		).toBe("A résztvevők 90%-a szerint Skooleenak lenni menő.");
	});
});
