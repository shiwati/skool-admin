import { describe, expect, it } from "vitest";
import {
	ageFromBirthYear,
	applicantInitials,
	attendedCount,
	buildEmailList,
	formatCount,
	formatDate,
	formatDateRange,
	formatDateTime,
	fullName,
	historyLabel,
	isAlumni,
	isOver16,
	programsSummary,
	latestApplication,
	parentLabel,
	programColorClass,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
} from "./format";
import type { ApplicantApplication, ApplicantListItem } from "./types";

const app = (
	id: string,
	status: ApplicantApplication["status"],
	name: string,
): ApplicantApplication => ({
	id,
	status,
	receivedAt: "2026-10-01T10:00:00.000Z",
	event: { id: `e-${id}`, name, from: "2026-10-10T08:00:00.000Z" },
});

const luca = {
	firstName: "Luca",
	lastName: "Nagy",
	birthYear: 2010,
	applications: [
		app("a1", "ACCEPTED", "Python alapok – ősz"),
		app("a2", "ATTENDED", "Robotika tábor"),
	],
};

const in2026 = new Date("2026-11-19T12:00:00Z");

describe("row formatting (spec scenario: Nagy Luca)", () => {
	it("shows name, age with 16+, newest program +1, status and history", () => {
		expect(fullName(luca)).toBe("Nagy Luca");
		expect(applicantInitials(luca)).toBe("NL");
		const age = ageFromBirthYear(luca.birthYear, in2026);
		expect(age).toBe(16);
		expect(isOver16(age)).toBe(true);
		const { latest, more } = latestApplication(luca.applications);
		expect(latest?.event.name).toBe("Python alapok – ősz");
		expect(more).toBe(1);
		expect(STATUS_LABELS[latest!.status]).toBe("Elfogadva");
		expect(attendedCount(luca.applications)).toBe(1);
		expect(historyLabel(luca.applications)).toBe("1 program");
	});

	it("handles missing birth year and no applications", () => {
		expect(ageFromBirthYear(null, in2026)).toBeNull();
		expect(isOver16(null)).toBe(false);
		expect(isOver16(15)).toBe(false);
		expect(latestApplication([])).toEqual({ latest: null, more: 0 });
		expect(historyLabel([])).toBe("—");
	});
});

describe("status mapping", () => {
	it("has a Hungarian label and badge for every status", () => {
		expect(STATUS_LABELS).toEqual({
			APPLIED: "Új jelentkező",
			ACCEPTED: "Elfogadva",
			WAITLISTED: "Várólista",
			ATTENDED: "Részt vett",
			REJECTED: "Elutasítva",
		});
		expect(Object.keys(STATUS_BADGE_CLASSES).sort()).toEqual(
			Object.keys(STATUS_LABELS).sort(),
		);
	});
});

describe("formatDate", () => {
	it("formats in Budapest time as YYYY.MM.DD", () => {
		expect(formatDate("2026-10-01T23:30:00.000Z")).toBe("2026.10.02");
		expect(formatDate("2026-11-10T09:00:00.000Z")).toBe("2026.11.10");
	});

	it("returns a dash for invalid input", () => {
		expect(formatDate("nope")).toBe("—");
	});
});

describe("formatCount", () => {
	it("groups thousands with a non-breaking space", () => {
		expect(formatCount(1248)).toBe("1 248");
		expect(formatCount(86)).toBe("86");
	});
});

describe("programColorClass", () => {
	it("is deterministic and from the brand palette", () => {
		expect(programColorClass("evt_1")).toBe(programColorClass("evt_1"));
		expect(programColorClass("evt_1")).toMatch(
			/^bg-(lavender|sky|pink|peach|lemon|sage)$/,
		);
	});
});

describe("buildEmailList (spec scenario: copying with a missing address)", () => {
	it("joins with comma and space, skipping empty addresses", () => {
		expect(buildEmailList(["a@x.hu", null, "b@y.hu"])).toEqual({
			text: "a@x.hu, b@y.hu",
			count: 2,
		});
	});

	it("deduplicates case-insensitively, keeping the first spelling", () => {
		expect(
			buildEmailList([
				" Anna@X.hu ",
				"anna@x.hu",
				"",
				undefined,
				"b@y.hu",
			]),
		).toEqual({ text: "Anna@X.hu, b@y.hu", count: 2 });
	});

	it("returns an empty list when there is nothing to copy", () => {
		expect(buildEmailList([null, ""])).toEqual({ text: "", count: 0 });
	});
});

describe("parentLabel", () => {
	it("combines the parent's name, or returns null", () => {
		const base = {
			parentFirstName: "Éva",
			parentLastName: "Nagy",
			parentEmail: "eva@x.hu",
		} as ApplicantListItem;
		expect(parentLabel(base)).toEqual({
			name: "Nagy Éva",
			email: "eva@x.hu",
		});
		expect(
			parentLabel({
				...base,
				parentFirstName: null,
				parentLastName: null,
				parentEmail: null,
			}),
		).toEqual({ name: null, email: null });
	});
});

describe("detail page date helpers", () => {
	it("formats date and time in Budapest time", () => {
		// 23:30 UTC on 1 Oct is 01:30 on 2 Oct in Budapest (CEST).
		expect(formatDateTime("2026-10-01T23:30:00.000Z")).toBe(
			"2026.10.02 01:30",
		);
		expect(formatDateTime(new Date("2026-11-10T09:05:00.000Z"))).toBe(
			"2026.11.10 10:05",
		);
		expect(formatDateTime("nope")).toBe("—");
	});

	it("accepts Date objects in formatDate", () => {
		expect(formatDate(new Date("2026-11-10T09:00:00.000Z"))).toBe(
			"2026.11.10",
		);
	});

	it("formats a date range", () => {
		expect(
			formatDateRange(
				new Date("2026-11-21T09:00:00.000Z"),
				"2026-12-12T15:00:00.000Z",
			),
		).toBe("2026.11.21 – 2026.12.12");
	});
});

describe("alumni and programs summary", () => {
	const apps = [
		{ status: "ACCEPTED" as const },
		{ status: "ATTENDED" as const },
		{ status: "ATTENDED" as const },
	];

	it("summarises applications", () => {
		expect(programsSummary(apps)).toBe("3 jelentkezés · 2 elvégzett");
		expect(programsSummary([])).toBe("0 jelentkezés · 0 elvégzett");
	});

	it("flags alumni only with an attended application", () => {
		expect(isAlumni(apps)).toBe(true);
		expect(isAlumni([{ status: "ACCEPTED" }])).toBe(false);
		expect(isAlumni([])).toBe(false);
	});
});
