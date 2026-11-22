import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuplicateApplicant } from "@/lib/applicants/types";
import { DuplicateReviewDialog } from "./duplicate-review-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const applicant = (
	id: string,
	applications: DuplicateApplicant["applications"],
): DuplicateApplicant => ({
	id,
	createdAt: "2026-10-14T16:02:00.000Z",
	firstName: "Boróka",
	lastName: "Kiss",
	birthYear: 2013,
	schoolName: null,
	hometown: null,
	phoneNumber: null,
	email: "kiss.bori@freemail.hu",
	parentFirstName: null,
	parentLastName: null,
	parentMothersName: null,
	parentAddress: null,
	parentEmail: null,
	parentPhone: null,
	newsletter: false,
	applications,
});

const pair = {
	a: applicant("a", [
		{
			id: "app1",
			receivedAt: "2026-10-14T16:02:00.000Z",
			status: "ACCEPTED",
			event: { id: "e1", name: "Python alapok – ősz" },
		},
	]),
	b: applicant("b", [
		{
			id: "app2",
			receivedAt: "2026-03-01T10:00:00.000Z",
			status: "ATTENDED",
			event: { id: "e2", name: "Robotika tábor" },
		},
	]),
};

const fetchMock = vi.fn();

describe("DuplicateReviewDialog", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		fetchMock.mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify({ total: 1, index: 0, pair }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("explains on merge that only personal data is chosen and every application is kept", async () => {
		const user = userEvent.setup();
		render(
			<DuplicateReviewDialog
				open
				onOpenChange={() => {}}
				onChanged={() => {}}
			/>,
		);
		await screen.findByText("Duplikáció – összevonás");
		expect(
			screen.queryByRole("note", { name: "Mi történik összevonáskor?" }),
		).not.toBeInTheDocument();

		await user.click(screen.getByText("Duplikáció – összevonás"));

		const note = screen.getByRole("note", {
			name: "Mi történik összevonáskor?",
		});
		expect(note).toHaveTextContent(
			"Csak a jelentkező személyes adatai közül marad meg a kiválasztott adatlapé",
		);
		expect(note).toHaveTextContent("Semmi sem cserélődik le.");
		expect(
			screen.getByText(
				"Python alapok – ősz (Elfogadva), Robotika tábor (Részt vett)",
			),
		).toBeInTheDocument();
	});

	it("shows no merge note when the pair is kept apart", async () => {
		const user = userEvent.setup();
		render(
			<DuplicateReviewDialog
				open
				onOpenChange={() => {}}
				onChanged={() => {}}
			/>,
		);
		await user.click(
			await screen.findByText(
				"Nem duplikáció – mindkét jelentkező megmarad",
			),
		);
		expect(
			screen.queryByRole("note", { name: "Mi történik összevonáskor?" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Összevonás után:")).not.toBeInTheDocument();
	});
});
