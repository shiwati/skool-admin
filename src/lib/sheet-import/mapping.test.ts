import { describe, expect, it } from "vitest";
import { historyFieldLabel } from "@/lib/applicants/detail-labels";
import {
	APPLICATION_FIELD_LABELS,
	APPLICATION_FIELDS,
	duplicateKey,
	mapHeaders,
	parseRow,
	serialToDate,
} from "./mapping";

// Header row copied from a real Skool form response sheet.
const HEADERS = [
	"Időbélyeg",
	"Vezetéknév",
	"Utónév",
	"Melyik évben születtél?",
	"Iskolám neve, ahova járok:",
	"Település, ahol lakom:",
	"Mobiltelefonszám, amelyen szükség esetén elérhetünk:",
	"E-mail cím:",
	"Te milyen problémát oldanál meg szívesen a technológia segítségével azért, hogy a világ egy jobb hely legyen? ",
	"Részt vettél már valaha informatikai foglalkozáson? Ha igen, kérünk oszd meg velünk milyen volt.",
	"Programoztál már valaha?",
	"Részt vettél már valaha Skool foglalkozáson?",
	"Ha igen, mi volt az pontosan és hogy érezted magad?",
	"KITŐL hallottál először a foglalkozásról",
	"HONNAN hallottál erről a foglalkozásról?",
	"Hallottál már a partneri vállalatról?",
	"Van esetleg valamilyen ételérzékenységed, melyet az ebéd rendelésénél figyelembe vehetünk?",
	"Szülő/Törvényes képviselő vezetékneve",
	"Szülő/Törvényes képviselő utóneve",
	"Szülő/Törvényes képviselő anyjának neve",
	"Szülő/Törvényes képviselő állandó lakcíme",
	"Kérjük add meg nekünk email címed, ahová a visszaigazolást küldhetjük.",
	"Kérjük, add meg nekünk mobil telefonszámod, melyen szükség esetén elérhetünk.",
	"Szeretnél értesülni további programjainkról?",
	"1. oszlop",
];

describe("mapHeaders", () => {
	it("maps every column of the real form to the right field", () => {
		const { columns, unmapped, missingRequired } = mapHeaders(HEADERS);
		expect(columns).toEqual({
			receivedAt: 0,
			lastName: 1,
			firstName: 2,
			birthYear: 3,
			schoolName: 4,
			hometown: 5,
			phoneNumber: 6,
			email: 7,
			solvedProblem: 8,
			pastParticipationOther: 9,
			pastExpInProg: 10,
			pastParticipationSkool: 11,
			pastParticipationSkoolDesc: 12,
			heardFromWhom: 13,
			heardFromWhere: 14,
			companyAwareness: 15,
			foodPreference: 16,
			parentLastName: 17,
			parentFirstName: 18,
			parentMothersName: 19,
			parentAddress: 20,
			parentEmail: 21,
			parentPhone: 22,
			newsletter: 23,
		});
		expect(unmapped).toEqual(["1. oszlop"]);
		expect(missingRequired).toEqual([]);
	});

	it("uses the first matching column and leaves later ones unmapped", () => {
		const { columns, unmapped } = mapHeaders([
			"  VEZETÉKNÉV ",
			"Vezetéknév (újra)",
			"Utónév",
			"Póló méret",
		]);
		expect(columns).toEqual({ lastName: 0, firstName: 2 });
		expect(unmapped).toEqual(["Vezetéknév (újra)", "Póló méret"]);
	});

	it("maps the parent e-mail header to the parent e-mail, not the address", () => {
		const { columns } = mapHeaders([
			"Szülő e-mail címe",
			"E-mail cím",
			"Szülő lakcíme",
		]);
		expect(columns).toMatchObject({
			parentEmail: 0,
			email: 1,
			parentAddress: 2,
		});
	});

	it("reports missing required columns", () => {
		expect(mapHeaders(["Időbélyeg", "Vezetéknév"]).missingRequired).toEqual(
			["firstName", "email"],
		);
	});
});

describe("parseRow", () => {
	const { columns } = mapHeaders(HEADERS);
	const row = (values: Record<number, string | number>) =>
		HEADERS.map((_, i) => values[i] ?? "");

	it("parses a full response", () => {
		const parsed = parseRow(
			row({
				0: 45736.5, // 2025-03-20 12:00 Budapest (CET)
				1: " Kovács ",
				2: "Anna",
				3: 2011,
				7: "Anna@Example.com",
				11: "Igen",
				12: "Nyári tábor",
				15: "Nem",
				21: "szulo@example.com",
				22: 36301234567,
				23: "Igen, kérek értesítést",
			}),
			columns,
			"Europe/Budapest",
		);
		expect(parsed.ok).toBe(true);
		if (parsed.ok !== true) return;
		expect(parsed.applicant).toMatchObject({
			lastName: "Kovács",
			firstName: "Anna",
			email: "anna@example.com",
			birthYear: 2011,
			schoolName: null,
			parentEmail: "szulo@example.com",
			parentPhone: "36301234567",
			newsletter: true,
		});
		expect(parsed.sourceKey).toBe("45736.5|anna@example.com");
		expect(parsed.application).toMatchObject({
			receivedAt: new Date("2025-03-20T11:00:00Z"),
			pastParticipationSkool: true,
			pastParticipationSkoolDesc: "Nyári tábor",
			companyAwareness: false,
		});
	});

	it("skips empty rows and rejects rows without email or name", () => {
		expect(parseRow(row({}), columns, "UTC")).toEqual({ ok: "empty" });
		expect(parseRow(row({ 1: "A", 2: "B" }), columns, "UTC")).toEqual({
			ok: false,
			reason: "Hiányzó vagy hibás e-mail cím",
		});
		expect(parseRow(row({ 7: "a@b.hu" }), columns, "UTC")).toEqual({
			ok: false,
			reason: "Hiányzó név",
		});
	});
});

describe("serialToDate", () => {
	it("reads the timestamp in the sheet's time zone", () => {
		// 2025-03-01 10:00 in Budapest is CET (UTC+1).
		expect(serialToDate(45717 + 10 / 24, "Europe/Budapest")).toEqual(
			new Date("2025-03-01T09:00:00Z"),
		);
	});

	it("applies the sheet's time zone including DST", () => {
		// 2025-07-01 08:30 in Budapest is CEST (UTC+2).
		expect(serialToDate(45839 + 8.5 / 24, "Europe/Budapest")).toEqual(
			new Date("2025-07-01T06:30:00Z"),
		);
	});
});

describe("duplicateKey", () => {
	it("ignores case, accents and extra spaces", () => {
		expect(duplicateKey(" Kovács", "Anna  Mária", "Anna@Example.com")).toBe(
			duplicateKey("kovacs", "anna maria", "anna@example.com"),
		);
		expect(duplicateKey("Kovács", "Anna", "a@x.hu")).not.toBe(
			duplicateKey("Kovács", "Anna", "b@x.hu"),
		);
	});
});

it("still recognises the older Sigma wording", () => {
	expect(mapHeaders(["Hallottál már a Sigmáról?"]).columns).toEqual({
		companyAwareness: 0,
	});
});

describe("APPLICATION_FIELD_LABELS", () => {
	it("uses the same labels as the change history", () => {
		for (const field of APPLICATION_FIELDS) {
			if (field === "receivedAt") continue;
			expect(APPLICATION_FIELD_LABELS[field]).toBe(
				historyFieldLabel(field),
			);
		}
	});

	it("labels the form's problem question as the problem to solve", () => {
		expect(APPLICATION_FIELD_LABELS.solvedProblem).toBe(
			"Megoldandó probléma",
		);
		expect(APPLICATION_FIELD_LABELS.parentAddress).toBe("Szülő címe");
		expect(APPLICATION_FIELD_LABELS.receivedAt).toBe(
			"Jelentkezés időpontja (időbélyeg)",
		);
	});
});
