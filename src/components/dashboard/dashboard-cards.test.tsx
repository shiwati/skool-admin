import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CapacityChart } from "./capacity-chart";
import { DemographicsCard } from "./demographics-card";
import { KpiCard, KpiGrid } from "./kpi-card";
import { SatisfactionCard } from "./satisfaction-card";
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

describe("KPI grid (02.1 M / T)", () => {
	it("uses two columns on mobile with the wide card spanning both, three from tablet", () => {
		render(
			<KpiGrid>
				<KpiCard label="Összes jelentkező" value="1 248" note="x" />
				<KpiCard label="Átlagos túljelentkezés" value="2,4×" note="x" />
				<KpiCard label="Átlagos elégedettség" value="—" note="x" wide />
			</KpiGrid>,
		);
		expect(screen.getByTestId("kpi-grid")).toHaveClass(
			"grid-cols-2",
			"md:grid-cols-3",
		);
		const wide = screen
			.getByRole("heading", { name: "Átlagos elégedettség" })
			.closest("[data-slot=card]");
		expect(wide).toHaveClass("col-span-2", "md:col-span-1");
		expect(
			screen
				.getByRole("heading", { name: "Összes jelentkező" })
				.closest("[data-slot=card]"),
		).not.toHaveClass("col-span-2");
	});
});

describe("SatisfactionCard", () => {
	const empty = { average: null, count: 0 };
	const none = { yes: 0, maybe: 0, no: 0, total: 0 };

	it("lists programs with participant and mentor averages and the recommend share", () => {
		render(
			<SatisfactionCard
				programs={[
					{
						id: "a",
						name: "Python ősz",
						participant: { average: 4.63, count: 8 },
						mentor: { average: 4, count: 2 },
					},
				]}
				satisfaction={{
					PARTICIPANT: {
						score: { average: 4.63, count: 8 },
						recommend: { yes: 6, maybe: 1, no: 1, total: 8 },
						responses: 8,
					},
					MENTOR: {
						score: { average: 4, count: 2 },
						recommend: none,
						responses: 2,
					},
				}}
			/>,
		);
		expect(
			screen.getByRole("link", { name: "Python ősz" }),
		).toHaveAttribute("href", "/events/a/feedback");
		expect(screen.getByText("4,6")).toBeInTheDocument();
		expect(screen.getByText("4,0")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Résztvevők: 75% igen · 13% talán · 13% nem (8 válasz)",
			),
		).toBeInTheDocument();
		expect(screen.queryByText(/^Mentorok:/)).not.toBeInTheDocument();
	});

	it("shows an empty state without feedback", () => {
		render(
			<SatisfactionCard
				programs={[]}
				satisfaction={{
					PARTICIPANT: {
						score: empty,
						recommend: none,
						responses: 0,
					},
					MENTOR: { score: empty, recommend: none, responses: 0 },
				}}
			/>,
		);
		expect(
			screen.getByText(
				"A kiválasztott időszakban még nincs visszajelzés.",
			),
		).toBeInTheDocument();
	});
});
