import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ColumnId } from "@/lib/applicants/column-settings";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { cardValue } from "./columns";
import { applicant, boroka } from "./test-fixtures";

const in2026 = new Date("2026-11-19T12:00:00Z");

const text = (id: ColumnId, item: ApplicantListItem) =>
	render(<>{cardValue(id, item, in2026)}</>).container.textContent;

describe("cardValue (mobile card lines)", () => {
	it("renders the card values for Nagy Luca", () => {
		const luca = applicant();
		expect(text("age", luca)).toBe("16 év");
		expect(text("location", luca)).toBe("Budapest · Gimnázium");
		expect(text("newsletter", luca)).toBe("Feliratkozott");
		expect(text("history", luca)).toBe("1 program");
		expect(text("parent", luca)).toBe("Nagy Éva · nagy.eva@gmail.com");
	});

	it("falls back to the table cell and its placeholders", () => {
		expect(text("phone", applicant({ phoneNumber: null }))).toBe("—");
		expect(text("phone", applicant())).toBe("+36 30 123 4567");
		expect(text("status", applicant())).toBe("Elfogadva");
	});

	it("covers missing values", () => {
		expect(text("newsletter", boroka)).toBe("—");
		expect(text("history", boroka)).toBe("—");
		expect(text("age", applicant({ birthYear: null }))).toBe("—");
		expect(
			text("location", applicant({ hometown: null, schoolName: null })),
		).toBe("—");
		expect(
			text(
				"parent",
				applicant({
					parentFirstName: null,
					parentLastName: null,
					parentEmail: null,
				}),
			),
		).toBe("—");
	});
});
