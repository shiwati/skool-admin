import { describe, expect, it } from "vitest";
import {
	APPLICANT_TABLE,
	applicantHistoryWhere,
	historyRow,
	historyRows,
} from "./write";

const change = {
	recordId: "a1",
	fieldName: "email",
	oldValue: "x",
	newValue: "y",
};

describe("history rows", () => {
	it("builds a row with the actor, and the time only when given", () => {
		expect(historyRow(APPLICANT_TABLE, "u1", change)).toEqual({
			tableName: "applicant",
			...change,
			createdById: "u1",
		});
		const at = new Date("2026-11-22T10:00:00Z");
		expect(historyRows(APPLICANT_TABLE, "u1", [change], at)).toEqual([
			{
				tableName: "applicant",
				...change,
				createdById: "u1",
				createdAt: at,
			},
		]);
	});

	it("selects applicant rows, and application rows only when there are any", () => {
		expect(applicantHistoryWhere(["a1"], [])).toEqual({
			OR: [{ tableName: "applicant", recordId: { in: ["a1"] } }],
		});
		expect(applicantHistoryWhere(["a1"], ["p1"])).toEqual({
			OR: [
				{ tableName: "applicant", recordId: { in: ["a1"] } },
				{ tableName: "application", recordId: { in: ["p1"] } },
			],
		});
	});
});
