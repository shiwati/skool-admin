import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FoodNeeds } from "@/lib/events/food-needs";
import { FoodNeedsCard } from "./food-needs-card";

const foodNeeds: FoodNeeds = {
	covered: 6,
	unrestricted: 3,
	groups: [
		{
			status: "ATTENDED",
			rows: [
				{
					applicantId: "p2",
					name: "Nagy Béla",
					answer: "gluténmentes",
				},
			],
		},
		{
			status: "ACCEPTED",
			rows: [
				{
					applicantId: "p1",
					name: "Kiss Anna",
					answer: "laktózmentes",
				},
				{
					applicantId: "p3",
					name: "Tóth Eszter",
					answer: "laktózmentes",
				},
			],
		},
	],
};

describe("FoodNeedsCard", () => {
	it("has a name and a food need column", () => {
		render(<FoodNeedsCard foodNeeds={foodNeeds} />);
		expect(
			screen.getByRole("columnheader", { name: "Név" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Étkezési igény" }),
		).toBeInTheDocument();
	});

	it("names each status group and lists its rows in order", () => {
		render(<FoodNeedsCard foodNeeds={foodNeeds} />);
		const accepted = within(
			screen.getByRole("rowgroup", { name: "Elfogadva" }),
		);
		expect(
			accepted.getByRole("columnheader", { name: /Elfogadva/ }),
		).toBeInTheDocument();
		const rows = accepted.getAllByRole("row").slice(1);
		expect(rows.map((r) => r.textContent)).toEqual([
			"Kiss Annalaktózmentes",
			"Tóth Eszterlaktózmentes",
		]);
		expect(
			accepted.getByRole("link", { name: "Kiss Anna" }),
		).toHaveAttribute("href", "/applicants/p1");
		expect(
			screen.getByRole("rowgroup", { name: "Részt vett" }),
		).toBeInTheDocument();
	});

	it("marks the rows of a group, but not its name row, with a bar in the status colour", () => {
		render(<FoodNeedsCard foodNeeds={foodNeeds} />);
		const group = within(
			screen.getByRole("rowgroup", { name: "Elfogadva" }),
		);
		const [header, ...rows] = group.getAllByRole("row");
		expect(rows.every((row) => row.querySelector(".bg-mint"))).toBe(true);
		expect(header.querySelector(".bg-mint")).toBeNull();
		const attended = within(
			screen.getByRole("rowgroup", { name: "Részt vett" }),
		);
		expect(
			attended
				.getAllByRole("row")
				.slice(1)
				.every((row) => row.querySelector(".bg-lavender")),
		).toBe(true);
	});

	it("sums up the applicants without a food need at the end", () => {
		render(<FoodNeedsCard foodNeeds={foodNeeds} />);
		expect(
			screen.getByText(/Összesen 3 főnek nincs étkezési igénye\./),
		).toBeInTheDocument();
	});

	it("shows only the total when nobody has a food need", () => {
		render(
			<FoodNeedsCard
				foodNeeds={{ covered: 4, unrestricted: 4, groups: [] }}
			/>,
		);
		expect(screen.queryByRole("table")).toBeNull();
		expect(
			screen.getByText(/Összesen 4 főnek nincs étkezési igénye\./),
		).toBeInTheDocument();
	});

	it("shows an empty state without applicants", () => {
		render(
			<FoodNeedsCard
				foodNeeds={{ covered: 0, unrestricted: 0, groups: [] }}
			/>,
		);
		expect(
			screen.getByText(
				"Még nincs jelentkező, akinek az étkezési igényét mutathatnánk.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText(/Összesen/)).toBeNull();
	});
});
