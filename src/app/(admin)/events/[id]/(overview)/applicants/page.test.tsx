import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventOverview } from "@/components/events/overview/test-fixtures";

const {
	requireAdmin,
	getEventOverview,
	loadEventApplicationsPage,
	notFound,
	logError,
} = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	getEventOverview: vi.fn(),
	loadEventApplicationsPage: vi.fn(),
	logError: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/events/overview", () => ({ getEventOverview }));
vi.mock("@/lib/events/applications-list", () => ({
	loadEventApplicationsPage,
}));
vi.mock("@/lib/logger", () => ({ logger: { error: logError } }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/events/overview/applications-section", () => ({
	ApplicationsSection: ({
		eventId,
		capacity,
		initial,
	}: {
		eventId: string;
		capacity: number;
		initial?: { data: { total: number } };
	}) => (
		<div data-testid="applications">
			{`${eventId}:${capacity}:${initial ? initial.data.total : "none"}`}
		</div>
	),
}));

import EventApplicantsPage, { generateMetadata } from "./page";

const props = (
	id = "e1",
	searchParams: Record<string, string | string[]> = {},
) =>
	({
		params: Promise.resolve({ id }),
		searchParams: Promise.resolve(searchParams),
	}) as Parameters<typeof EventApplicantsPage>[0];

describe("event applicants tab page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
		loadEventApplicationsPage.mockResolvedValue({
			apiQuery: "sort=receivedAt&order=asc&page=1&pageSize=25",
			data: { items: [], total: 7, page: 1, pageSize: 25 },
		});
	});

	it("checks the session before reading data", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(EventApplicantsPage(props("e1"))).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/events/e1/applicants");
		expect(getEventOverview).not.toHaveBeenCalled();
		expect(loadEventApplicationsPage).not.toHaveBeenCalled();
	});

	it("shows the not-found page for an unknown program", async () => {
		getEventOverview.mockResolvedValue(null);
		await expect(EventApplicantsPage(props("gone"))).rejects.toThrow(
			"NEXT_NOT_FOUND",
		);
	});

	it("uses the program name in the title", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		expect(await generateMetadata(props())).toEqual({
			title: "Jelentkezők – Python alapok – ősz",
		});
	});

	it("renders the applications and links to the global applicants list", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(await EventApplicantsPage(props()));
		expect(screen.getByTestId("applications")).toHaveTextContent("e1:20:7");
		expect(
			screen.getByRole("link", {
				name: /Megnyitás a Jelentkezők listában/,
			}),
		).toHaveAttribute("href", "/applicants?eventIds=e1");
	});

	it("preloads the view described by the URL", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(
			await EventApplicantsPage(
				props("e1", { status: "WAITLISTED", sort: "age", page: "2" }),
			),
		);
		expect(loadEventApplicationsPage).toHaveBeenCalledWith("e1", {
			status: "WAITLISTED",
			sort: "age",
			order: "asc",
			page: 2,
			pageSize: 25,
		});
	});

	it("preloads the default view without a query", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(await EventApplicantsPage(props()));
		expect(loadEventApplicationsPage).toHaveBeenCalledWith("e1", {
			status: null,
			sort: "receivedAt",
			order: "asc",
			page: 1,
			pageSize: 25,
		});
	});

	it("leaves loading to the client when the preload fails", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		loadEventApplicationsPage.mockRejectedValue(new Error("db down"));
		render(await EventApplicantsPage(props()));
		expect(screen.getByTestId("applications")).toHaveTextContent(
			"e1:20:none",
		);
		expect(logError).toHaveBeenCalled();
	});
});
