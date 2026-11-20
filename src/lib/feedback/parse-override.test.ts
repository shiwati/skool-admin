import { describe, expect, it } from "vitest";
import {
	defaultFeedbackMapping,
	mapFeedbackHeaders,
	parseFeedbackRow,
} from "./parse";

const HEADERS = [
	"Időbélyeg",
	"Összességében hogy értékeled a műhelyfoglalkozás egészében?",
	"Mi volt a nap fénypontja?",
	"Milyen pizzát kérnél?",
];

describe("mapFeedbackHeaders with a saved mapping", () => {
	const mapping = {
		columns: {
			timestamp: "Időbélyeg",
			overallRating:
				"Összességében hogy értékeled a műhelyfoglalkozás egészében?",
		},
		custom: [
			{
				label: "Pizza",
				kind: "text" as const,
				header: "Milyen pizzát kérnél?",
			},
		],
	};

	it("maps only the saved headers and the custom questions", () => {
		const result = mapFeedbackHeaders("MENTOR", HEADERS, mapping);
		expect(result.timestamp).toBe(0);
		expect(result.columns).toEqual({ overallRating: 1, "custom:Pizza": 3 });
		expect(result.missingRequired).toEqual([]);
		expect(result.unmapped).toEqual(["Mi volt a nap fénypontja?"]);
	});

	it("stores custom answers and includes them in the search text", () => {
		const result = mapFeedbackHeaders("MENTOR", HEADERS, mapping);
		const row = parseFeedbackRow(
			"MENTOR",
			[46000, 5, "x", "Margherita"],
			result,
			"Europe/Budapest",
		);
		expect(row).toMatchObject({
			ok: true,
			answers: { overallRating: 5, "custom:Pizza": "Margherita" },
			overallScore: 5,
			searchText: "margherita",
		});
	});

	it("reports a required question whose header is missing", () => {
		const result = mapFeedbackHeaders("MENTOR", HEADERS, {
			columns: { timestamp: "Időbélyeg", overallRating: "Régi kérdés" },
			custom: [],
		});
		expect(result.missingRequired).toEqual([
			"A műhelyfoglalkozás összességében",
		]);
	});
});

describe("defaultFeedbackMapping", () => {
	it("returns the keyword matches as exact headers", () => {
		expect(defaultFeedbackMapping("MENTOR", HEADERS)).toEqual({
			columns: {
				timestamp: "Időbélyeg",
				overallRating:
					"Összességében hogy értékeled a műhelyfoglalkozás egészében?",
				highlight: "Mi volt a nap fénypontja?",
			},
			custom: [],
		});
	});
});
