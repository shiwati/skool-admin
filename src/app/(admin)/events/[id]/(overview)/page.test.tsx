import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventOverview,
	overviewCounts,
	overviewEvent,
} from "@/components/events/overview/test-fixtures";

const { requireAdmin, getEventOverview, getFoodNeeds, notFound } = vi.hoisted(
	() => ({
		requireAdmin: vi.fn(),
		getEventOverview: vi.fn(),
		getFoodNeeds: vi.fn(),
		notFound: vi.fn(() => {
			throw new Error("NEXT_NOT_FOUND");
		}),
	}),
);
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/events/overview", () => ({ getEventOverview }));
vi.mock("@/lib/events/food-needs-load", () => ({ getFoodNeeds }));
vi.mock("next/navigation", () => ({
	notFound,
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

import EventOverviewPage, { generateMetadata } from "./page";

const props = (id = "e1") =>
	({ params: Promise.resolve({ id }) }) as Parameters<
		typeof EventOverviewPage
	>[0];

function kpi(label: string) {
	return screen.getByText(label, { selector: "dt" }).closest("div")!;
}

describe("event overview page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
		getFoodNeeds.mockResolvedValue({
			covered: 0,
			unrestricted: 0,
			groups: [],
		});
	});

	it("checks the session before reading data and never reads without one", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(EventOverviewPage(props("e1"))).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/events/e1");
		expect(getEventOverview).not.toHaveBeenCalled();
	});

	it("shows the not-found page for an unknown program", async () => {
		getEventOverview.mockResolvedValue(null);
		await expect(EventOverviewPage(props("gone"))).rejects.toThrow(
			"NEXT_NOT_FOUND",
		);
		expect(notFound).toHaveBeenCalled();
	});

	it("uses the program name as the page title", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		expect(await generateMetadata(props())).toEqual({
			title: "Python alapok – ősz",
		});
	});

	it("shows the KPI cards of an over-subscribed program", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(await EventOverviewPage(props()));
		expect(kpi("Kapacitás")).toHaveTextContent("20");
		expect(kpi("Jelentkezett")).toHaveTextContent("62");
		expect(kpi("Jelentkezett")).toHaveTextContent("3,1×");
		expect(kpi("Elfogadva")).toHaveTextContent("20/ 20 – betelt");
		expect(kpi("Várólista")).toHaveTextContent("18· 24 új");
	});

	it("shows a program without capacity or applications without a ratio", async () => {
		getEventOverview.mockResolvedValue(
			eventOverview({
				event: overviewEvent({ capacity: 0 }),
				counts: overviewCounts({
					total: 0,
					APPLIED: 0,
					ACCEPTED: 0,
					WAITLISTED: 0,
				}),
			}),
		);
		render(await EventOverviewPage(props()));
		expect(kpi("Kapacitás")).toHaveTextContent("—");
		expect(kpi("Jelentkezett")).not.toHaveTextContent("×");
		expect(kpi("Elfogadva")).not.toHaveTextContent("/");
		expect(
			screen.getByText("Még nincs jelentkező ehhez a programhoz."),
		).toBeInTheDocument();
	});

	it("shows details, people and the empty history", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(await EventOverviewPage(props()));
		expect(
			screen.getByRole("heading", { name: "Program adatai" }),
		).toBeInTheDocument();
		expect(screen.getByText("12–18 év")).toBeInTheDocument();
		expect(screen.getByText("Négy szombati alkalom.")).toBeInTheDocument();
		expect(screen.getByText("Szűcs Petra")).toBeInTheDocument();
		expect(
			screen.getByText("Még nincs rögzített változás"),
		).toBeInTheDocument();
	});

	it("shows the food needs card of the program", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		getFoodNeeds.mockResolvedValue({
			covered: 3,
			unrestricted: 2,
			groups: [
				{
					status: "ACCEPTED",
					rows: [
						{
							applicantId: "p1",
							name: "Kiss Anna",
							answer: "laktózmentes",
						},
					],
				},
			],
		});
		render(await EventOverviewPage(props()));
		expect(getFoodNeeds).toHaveBeenCalledWith("e1");
		expect(
			screen.getByRole("heading", { name: "Étkezési igény" }),
		).toBeInTheDocument();
		expect(screen.getByText("laktózmentes")).toBeInTheDocument();
	});

	it("shows the latest change with who, field and old → new value", async () => {
		getEventOverview.mockResolvedValue(
			eventOverview({
				history: [
					{
						id: "h1",
						actor: "Kovács Anna",
						field: "capacity",
						oldValue: "18",
						newValue: "20",
						createdAt: new Date("2026-11-19T09:12:00Z"),
					},
				],
			}),
		);
		render(await EventOverviewPage(props()));
		const card = within(
			screen
				.getByRole("heading", { name: "Legutóbbi változások" })
				.closest("section")!,
		);
		expect(
			card.getByText(/módosította: Max. tanulói létszám/),
		).toBeInTheDocument();
		expect(card.getByText("Kovács Anna")).toBeInTheDocument();
		expect(card.getByText("18")).toBeInTheDocument();
		expect(card.getByText("20")).toBeInTheDocument();
		expect(card.getByText("2026.11.19 10:12")).toBeInTheDocument();
		expect(
			card.getByRole("link", { name: "Teljes napló" }),
		).toHaveAttribute("href", "/history/e1");
	});
});
