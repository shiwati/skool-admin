import { describe, expect, it } from "vitest";
import { COLUMN_IDS, visibleColumns } from "./column-settings";
import { buildApplicantsCsv, EXPORT_COLUMNS } from "./export";
import type { ApplicantListItem } from "./types";

const NOW = new Date("2026-11-20T10:00:00Z");

const applicant: ApplicantListItem = {
	id: "a1",
	createdAt: "2026-03-05T09:00:00Z",
	firstName: "Béla",
	lastName: "Kiss",
	birthYear: 2010,
	schoolName: "Petőfi Gimnázium",
	hometown: "Pécs",
	phoneNumber: "+36 30 123 4567",
	email: "bela@example.com",
	parentFirstName: "Anna",
	parentLastName: "Kiss",
	parentEmail: "anna@example.com",
	newsletter: true,
	applications: [
		{
			id: "p1",
			status: "ACCEPTED",
			receivedAt: "2026-03-05T09:00:00Z",
			event: {
				id: "e2",
				name: "Robotika tábor",
				from: "2026-07-01T00:00:00Z",
			},
		},
		{
			id: "p2",
			status: "ATTENDED",
			receivedAt: "2025-03-05T09:00:00Z",
			event: {
				id: "e1",
				name: "Python hét",
				from: "2025-07-01T00:00:00Z",
			},
		},
	],
};

const lines = (csv: string) =>
	csv.replace(String.fromCharCode(0xfeff), "").trimEnd().split("\r\n");

describe("buildApplicantsCsv", () => {
	it("follows the given column order and skips the rest", () => {
		const csv = buildApplicantsCsv(
			[applicant],
			["createdAt", "name", "newsletter"],
			NOW,
		);
		expect(lines(csv)).toEqual([
			"Jelentkezett;Név;E-mail;Hírlevél",
			"2026.03.05;Kiss Béla;bela@example.com;igen",
		]);
	});

	it("honours hidden columns via the user's settings", () => {
		const columns = visibleColumns({
			order: ["phone", "name", "age"],
			hidden: ["age"],
		} as Parameters<typeof visibleColumns>[0]);
		const csv = buildApplicantsCsv([applicant], columns, NOW);
		expect(lines(csv)[0]).toBe("Telefonszám;Név;E-mail");
	});

	it("exports every column with table-equivalent values", () => {
		const csv = buildApplicantsCsv([applicant], COLUMN_IDS, NOW);
		expect(lines(csv)).toEqual([
			"Név;E-mail;Életkor;Program;Státusz;Település;Iskola;Hírlevél;Elvégzett programok;Jelentkezett;Szülő neve;Szülő e-mail;Telefonszám",
			"Kiss Béla;bela@example.com;16;Robotika tábor (+1);Elfogadva;Pécs;Petőfi Gimnázium;igen;1;2026.03.05;Kiss Anna;anna@example.com;+36 30 123 4567",
		]);
	});

	it("leaves missing values empty and neutralizes formulas", () => {
		const csv = buildApplicantsCsv(
			[
				{
					...applicant,
					lastName: "=HYPERLINK(1)",
					email: null,
					birthYear: null,
					applications: [],
					newsletter: false,
				},
			],
			["name", "age", "program", "status", "newsletter"],
			NOW,
		);
		expect(lines(csv)[1]).toBe("'=HYPERLINK(1) Béla;;;;;nem");
	});

	it("covers every configurable column", () => {
		expect(Object.keys(EXPORT_COLUMNS).sort()).toEqual(
			[...COLUMN_IDS].sort(),
		);
	});
});
