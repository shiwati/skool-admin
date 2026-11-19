import { describe, expect, it } from "vitest";
import {
	FORM_ANSWER_FIELDS,
	historyFieldLabel,
	historyValue,
} from "./detail-labels";

describe("detail labels", () => {
	it("labels known history fields and falls back to the field name", () => {
		expect(historyFieldLabel("status")).toBe("Státusz");
		expect(historyFieldLabel("phoneNumber")).toBe("Telefon");
		expect(historyFieldLabel("someNewField")).toBe("someNewField");
	});

	it("maps status values to their labels", () => {
		expect(historyValue("status", "ACCEPTED")).toBe("Elfogadva");
		expect(historyValue("status", "APPLIED")).toBe("Új jelentkező");
		expect(historyValue("status", "UNKNOWN")).toBe("UNKNOWN");
		expect(historyValue("email", "a@b.hu")).toBe("a@b.hu");
		expect(historyValue("status", null)).toBeNull();
	});

	it("shows newsletter values as Igen/Nem", () => {
		expect(historyValue("newsletter", "true")).toBe("Igen");
		expect(historyValue("newsletter", "false")).toBe("Nem");
	});

	it("lists form answers in the specified order", () => {
		expect(FORM_ANSWER_FIELDS.map((f) => f.label)).toEqual([
			"Honnan hallottál rólunk?",
			"Kitől hallottál rólunk?",
			"Milyen problémát oldanál meg?",
			"Van programozási tapasztalatod?",
			"Részt vettél már Skool programon?",
			"Korábbi Skool program",
			"Más programok",
			"Étkezési igény",
			"Megjegyzés",
		]);
	});
});
