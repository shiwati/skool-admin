import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CapacityChart } from "./capacity-chart";
import { DemographicsCard } from "./demographics-card";
import { KpiCard, KpiGrid } from "./kpi-card";
import { ChannelsCard, PartnersCard } from "./overview-cards";
import { ProgramFunnelCard, completionText } from "./program-cards";
import { SatisfactionCard } from "./satisfaction-card";
import { trendSummary } from "./oversubscription-trend";

describe("CapacityChart", () => {
	const rows = [
		{
			id: "a",
			name: "Python ősz",
			capacity: 20,
			applications: 62,
			byStatus: { APPLIED: 40, ACCEPTED: 22 },
			ratio: 3.1,
			state: "upcoming" as const,
		},
		{
			id: "b",
			name: "Robotika tábor",
			capacity: 30,
			applications: 24,
			byStatus: { ATTENDED: 24 },
			ratio: 0.8,
			state: "past" as const,
		},
	];

	it("starts with all programs, then past, then upcoming", async () => {
		const user = userEvent.setup();
		render(<CapacityChart rows={rows} />);
		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["Mind", "Múltbeli", "Jövőbeli"]);
		expect(screen.getByRole("button", { name: "Mind" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByText("3,1×")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Múltbeli" }));
		expect(screen.getByText("Robotika tábor")).toBeInTheDocument();
		expect(screen.queryByText("Python ősz")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Jövőbeli" }));
		expect(screen.getByText("Python ősz")).toBeInTheDocument();
		expect(screen.queryByText("Robotika tábor")).not.toBeInTheDocument();
	});

	it("has no tabs when all programs are over, as they would repeat the full list", () => {
		render(<CapacityChart rows={rows.filter((r) => r.state === "past")} />);
		expect(screen.queryByRole("group")).not.toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
	});

	it("has no tabs when no program is over yet", () => {
		render(
			<CapacityChart rows={rows.filter((r) => r.state === "upcoming")} />,
		);
		expect(screen.queryByRole("group")).not.toBeInTheDocument();
		expect(screen.getByText("Python ősz")).toBeInTheDocument();
	});
});

describe("DemographicsCard", () => {
	it("switches between age and hometown, without a year selector", async () => {
		const user = userEvent.setup();
		render(
			<DemographicsCard
				subtitle="Az összes diák"
				unit="diák"
				data={{
					total: 3,
					age: [{ label: "13–15", count: 3 }],
					hometown: [{ label: "Ózd", count: 3 }],
				}}
			/>,
		);
		expect(screen.getByText("13–15")).toBeInTheDocument();
		expect(screen.getByText("Az összes diák · 3 diák")).toBeInTheDocument();
		expect(
			screen.queryByRole("group", { name: "Év" }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Település" }));
		expect(screen.getByText("Ózd")).toBeInTheDocument();
	});

	it("shows the given empty state without data", () => {
		render(
			<DemographicsCard
				subtitle="A program jelentkezői"
				emptyText="Ehhez a programhoz még nincs jelentkezés."
				data={{ total: 0, age: [], hometown: [] }}
			/>,
		);
		expect(
			screen.getByText("Ehhez a programhoz még nincs jelentkezés."),
		).toBeInTheDocument();
	});

	it("shows the age fit under the age view only", async () => {
		const user = userEvent.setup();
		render(
			<DemographicsCard
				subtitle="A program jelentkezői"
				data={{
					total: 4,
					age: [{ label: "13–15", count: 4 }],
					hometown: [{ label: "Ózd", count: 4 }],
				}}
				ageFit={{
					range: { min: 12, max: 16 },
					known: 4,
					within: 3,
					below: 1,
					above: 0,
				}}
			/>,
		);
		expect(
			screen.getByText(
				"A meghirdetett 12–16 éves korosztályba tartozik: 75% · fiatalabb: 25% · idősebb: 0%",
			),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Település" }));
		expect(
			screen.queryByText(/korosztályba tartozik/),
		).not.toBeInTheDocument();
	});
});

describe("ProgramFunnelCard", () => {
	const funnel = {
		total: 20,
		accepted: 10,
		attended: 8,
		rejected: 5,
		waitlisted: 2,
		pending: 3,
	};

	it("shows the steps with shares and the attendance of the accepted", () => {
		render(<ProgramFunnelCard funnel={funnel} finished />);
		expect(screen.getByText("Jelentkezett")).toBeInTheDocument();
		expect(screen.getByText("20 · 100%")).toBeInTheDocument();
		expect(screen.getByText("10 · 50%")).toBeInTheDocument();
		expect(screen.getByText("8 · 40%")).toBeInTheDocument();
		expect(
			screen.getByText("Az elfogadottak 80%-a részt vett."),
		).toBeInTheDocument();
	});

	it("hides the attendance before the program is over", () => {
		render(<ProgramFunnelCard funnel={funnel} finished={false} />);
		expect(screen.queryByText("Részt vett")).not.toBeInTheDocument();
		expect(screen.queryByText(/részt vett\.$/)).not.toBeInTheDocument();
	});

	it("shows an empty state without applications", () => {
		render(
			<ProgramFunnelCard
				funnel={{ ...funnel, total: 0, accepted: 0, attended: 0 }}
				finished
			/>,
		);
		expect(
			screen.getByText("Ehhez a programhoz még nincs jelentkezés."),
		).toBeInTheDocument();
	});
});

describe("completionText", () => {
	it("shows the share when the expected count is known", () => {
		expect(
			completionText("Kitöltés – résztvevők", {
				responses: 6,
				expected: 8,
			}),
		).toBe("Kitöltés – résztvevők: 6 / 8 (75%)");
	});

	it("shows only the count when it is not", () => {
		expect(
			completionText("Kitöltés – mentorok", {
				responses: 2,
				expected: null,
			}),
		).toBe("Kitöltés – mentorok: 2 kitöltés");
	});
});

describe("ChannelsCard", () => {
	it("shows the count and the share, leaving 'Nincs adat' out of the 100%", () => {
		render(
			<ChannelsCard
				subtitle="x"
				rows={[
					{ label: "iskola", count: 6 },
					{ label: "barát", count: 2 },
					{ label: "Nincs adat", count: 12 },
				]}
			/>,
		);
		expect(screen.getByText("6 fő · 75%")).toBeInTheDocument();
		expect(screen.getByText("2 fő · 25%")).toBeInTheDocument();
		expect(screen.getByText("12 fő")).toBeInTheDocument();
	});

	it("shows no share when only 'Nincs adat' is left", () => {
		render(
			<ChannelsCard
				subtitle="x"
				rows={[{ label: "Nincs adat", count: 4 }]}
			/>,
		);
		expect(screen.getByText("4 fő")).toBeInTheDocument();
	});
});

describe("PartnersCard", () => {
	it("ranks the partners by their number of programs", () => {
		render(
			<PartnersCard
				rows={[
					{ name: "Minta Kft.", applications: 120, programs: 3 },
					{ name: "Példa Zrt.", applications: 80, programs: 2 },
				]}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Legaktívabb partnerek" }),
		).toBeInTheDocument();
		expect(screen.getByText("Minta Kft.")).toBeInTheDocument();
		expect(
			screen.getByText("3 program · 120 jelentkező"),
		).toBeInTheDocument();
		expect(screen.queryByText(/összesen/)).not.toBeInTheDocument();
	});

	it("shows an empty state without companies", () => {
		render(<PartnersCard rows={[]} />);
		expect(
			screen.getByText("Még nincs céghez rendelt program."),
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

describe("KpiCard", () => {
	it("shows the icon before the value", () => {
		render(
			<KpiCard
				label="Átlagos értékelés"
				value="4,6 / 5"
				note="x"
				icon={<svg data-testid="star" />}
			/>,
		);
		expect(screen.getByTestId("star")).toBeInTheDocument();
		expect(screen.getByText("4,6 / 5").closest("p")).toContainElement(
			screen.getByTestId("star"),
		);
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
