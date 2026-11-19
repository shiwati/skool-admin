import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CapacityChart } from "./capacity-chart";
import { DemographicsCard } from "./demographics-card";
import { trendSummary } from "./oversubscription-trend";

describe("CapacityChart", () => {
	const rows = [
		{
			id: "a",
			name: "Python ősz",
			capacity: 20,
			applications: 62,
			ratio: 3.1,
			state: "upcoming" as const,
		},
		{
			id: "b",
			name: "Robotika tábor",
			capacity: 30,
			applications: 24,
			ratio: 0.8,
			state: "past" as const,
		},
	];

	it("filters by upcoming / past / all", async () => {
		const user = userEvent.setup();
		render(<CapacityChart rows={rows} />);
		expect(screen.getByText("Python ősz")).toBeInTheDocument();
		expect(screen.queryByText("Robotika tábor")).not.toBeInTheDocument();
		expect(screen.getByText("3,1×")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Múltbeli" }));
		expect(screen.getByText("Robotika tábor")).toBeInTheDocument();
		expect(screen.queryByText("Python ősz")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Mind" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});
});

describe("DemographicsCard", () => {
	it("switches between age and hometown, without a year selector", async () => {
		const user = userEvent.setup();
		render(
			<DemographicsCard
				periodLabel="2026 (idei év)"
				data={{
					total: 3,
					age: [{ label: "13–15", count: 3 }],
					hometown: [{ label: "Ózd", count: 3 }],
				}}
			/>,
		);
		expect(screen.getByText("13–15")).toBeInTheDocument();
		expect(
			screen.getByText(/induló programok jelentkezései · 3 jelentkezés$/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("group", { name: "Év" }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Település" }));
		expect(screen.getByText("Ózd")).toBeInTheDocument();
	});

	it("shows an empty state for a period without applications", () => {
		render(
			<DemographicsCard
				periodLabel="2025"
				data={{ total: 0, age: [], hometown: [] }}
			/>,
		);
		expect(
			screen.getByText(
				"A kiválasztott időszakban még nincs jelentkezés.",
			),
		).toBeInTheDocument();
	});
});

describe("trendSummary", () => {
	const point = (label: string, ratio: number | null) => ({
		key: label,
		label,
		applications: 0,
		capacity: 0,
		ratio,
	});

	it("compares the first and last month with data", () => {
		expect(
			trendSummary([
				point("jún", 3.1),
				point("júl", null),
				point("nov", 2.4),
			]),
		).toBe("A túljelentkezés csökken: jún 3,1× → nov 2,4×.");
	});

	it("handles missing data", () => {
		expect(trendSummary([point("jún", null)])).toMatch(/nem indult/);
	});
});
