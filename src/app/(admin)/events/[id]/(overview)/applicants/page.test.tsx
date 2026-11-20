import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventOverview } from "@/components/events/overview/test-fixtures";

const { requireAdmin, getEventOverview, notFound } = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	getEventOverview: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/events/overview", () => ({ getEventOverview }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/events/overview/applications-section", () => ({
	ApplicationsSection: ({
		eventId,
		capacity,
	}: {
		eventId: string;
		capacity: number;
	}) => <div data-testid="applications">{`${eventId}:${capacity}`}</div>,
}));

import EventApplicantsPage, { generateMetadata } from "./page";

const props = (id = "e1") =>
	({ params: Promise.resolve({ id }) }) as Parameters<
		typeof EventApplicantsPage
	>[0];

describe("event applicants tab page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
	});

	it("checks the session before reading data", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(EventApplicantsPage(props("e1"))).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/events/e1/applicants");
		expect(getEventOverview).not.toHaveBeenCalled();
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
		expect(screen.getByTestId("applications")).toHaveTextContent(/:20$/);
		expect(
			screen.getByRole("link", {
				name: /Megnyitás a Jelentkezők listában/,
			}),
		).toHaveAttribute("href", "/applicants?eventIds=e1");
	});
});
