import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventOverview,
	overviewEvent,
} from "@/components/events/overview/test-fixtures";

const {
	requireAdmin,
	getEventOverview,
	notFound,
	parseFeedbackQuery,
	listFeedback,
	lastFeedbackImport,
	getFeedback,
	view,
} = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	getEventOverview: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
	parseFeedbackQuery: vi.fn(),
	listFeedback: vi.fn(),
	lastFeedbackImport: vi.fn(),
	getFeedback: vi.fn(),
	view: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/events/overview", () => ({ getEventOverview }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/feedback/list", () => ({
	parseFeedbackQuery,
	listFeedback,
	lastFeedbackImport,
	getFeedback,
}));
vi.mock("@/components/feedback/feedback-sync-button", () => ({
	FeedbackSyncButton: ({ eventId }: { eventId: string }) => (
		<button type="button">{`sync:${eventId}`}</button>
	),
}));
vi.mock("@/components/feedback/feedback-view", () => ({
	FeedbackView: (props: { header?: ReactNode }) => {
		view(props);
		return <div>{props.header}</div>;
	},
}));

import EventFeedbackPage from "./page";

const props = (searchParams: Record<string, string> = {}) =>
	({
		params: Promise.resolve({ id: "e1" }),
		searchParams: Promise.resolve(searchParams),
	}) as Parameters<typeof EventFeedbackPage>[0];

const PAGE = {
	items: [],
	total: 0,
	page: 1,
	pageSize: 20,
	stats: {
		count: 0,
		averageScore: null,
		recommendRate: null,
		responseRate: null,
	},
};

describe("event feedback tab page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
		getEventOverview.mockResolvedValue(
			eventOverview({
				event: overviewEvent({
					participantFeedbackSheetUrl:
						"https://docs.google.com/spreadsheets/d/p/edit",
				}),
			}),
		);
		parseFeedbackQuery.mockReturnValue({});
		listFeedback.mockResolvedValue(PAGE);
		lastFeedbackImport.mockResolvedValue(null);
		getFeedback.mockResolvedValue(null);
	});

	it("checks the session with this tab as the return address", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(EventFeedbackPage(props())).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/events/e1/feedback");
		expect(getEventOverview).not.toHaveBeenCalled();
	});

	it("filters to the program and ignores a period in the URL", async () => {
		parseFeedbackQuery.mockReturnValue({ period: "2025", eventId: "e2" });
		render(await EventFeedbackPage(props({ period: "2025" })));
		expect(listFeedback).toHaveBeenCalledWith({
			period: undefined,
			eventId: "e1",
		});
		expect(view.mock.calls[0][0]).toMatchObject({
			basePath: "/events/e1/feedback",
			state: { period: undefined, eventId: undefined },
		});
	});

	it("does not open a response of another program", async () => {
		parseFeedbackQuery.mockReturnValue({ open: "f9" });
		getFeedback.mockResolvedValue({ id: "f9", eventId: "e2" });
		render(await EventFeedbackPage(props({ open: "f9" })));
		expect(getFeedback).toHaveBeenCalledWith("f9");
		expect(view.mock.calls[0][0]).toMatchObject({ openItem: null });
	});

	it("opens a response of this program", async () => {
		const item = { id: "f1", eventId: "e1" };
		parseFeedbackQuery.mockReturnValue({ open: "f1" });
		getFeedback.mockResolvedValue(item);
		render(await EventFeedbackPage(props({ open: "f1" })));
		expect(view.mock.calls[0][0]).toMatchObject({ openItem: item });
	});

	it("shows which sheets are set and the sync button", async () => {
		render(await EventFeedbackPage(props()));
		expect(
			screen.getByText(
				/Résztvevői sheet: megadva · mentori sheet: nincs/,
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "sync:e1" }),
		).toBeInTheDocument();
	});

	it("hides the sync button and links to editing without sheets", async () => {
		getEventOverview.mockResolvedValue(eventOverview());
		render(await EventFeedbackPage(props()));
		expect(
			screen.getByText(
				/Ehhez a programhoz még nincs visszajelző sheet megadva\./,
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Megadás a szerkesztésnél" }),
		).toHaveAttribute("href", "/events/e1/edit");
		expect(screen.queryByRole("button")).toBeNull();
	});
});
