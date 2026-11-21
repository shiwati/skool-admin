import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEvent, notFound } = vi.hoisted(() => ({
	getEvent: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
vi.mock("@/lib/events/queries", () => ({ getEvent }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/events/event-form", () => ({
	EventForm: () => null,
}));

import EditEventPage, { metadata } from "./page";

const props = (id = "e1") =>
	({ params: Promise.resolve({ id }) }) as Parameters<
		typeof EditEventPage
	>[0];

describe("event edit page", () => {
	beforeEach(() => vi.clearAllMocks());

	it("is titled Program szerkesztése", () => {
		expect(metadata).toEqual({ title: "Program szerkesztése" });
	});

	it("shows the not-found page for an unknown program", async () => {
		getEvent.mockResolvedValue(null);
		await expect(EditEventPage(props("gone"))).rejects.toThrow(
			"NEXT_NOT_FOUND",
		);
		expect(getEvent).toHaveBeenCalledWith("gone");
	});

	it("fills the form with the stored values", async () => {
		getEvent.mockResolvedValue({
			id: "e1",
			name: "Tábor",
			tags: ["robotika"],
			description: null,
			from: new Date("2026-07-01T08:00:00Z"),
			to: new Date("2026-07-05T16:00:00Z"),
			companyName: "Sigma",
			location: "Pécs",
			capacity: 20,
			ageRange: null,
			applicationSheetUrl: null,
			participantFeedbackSheetUrl: null,
			mentorFeedbackSheetUrl: null,
			applicationSheetMapping: null,
			participantFeedbackSheetMapping: null,
			mentorFeedbackSheetMapping: null,
			instructor: null,
			mentors: [],
		});
		const element = await EditEventPage(props());
		expect(element.props).toMatchObject({
			mode: "edit",
			event: {
				id: "e1",
				name: "Tábor",
				from: "2026-07-01T08:00:00.000Z",
				to: "2026-07-05T16:00:00.000Z",
				companyName: "Sigma",
				location: "Pécs",
				capacity: 20,
			},
		});
		expect(notFound).not.toHaveBeenCalled();
	});
});
