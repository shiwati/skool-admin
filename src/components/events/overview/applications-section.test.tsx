import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { overviewCounts } from "./test-fixtures";

const { push, refresh, toastSuccess, toastError } = vi.hoisted(() => ({
	push: vi.fn(),
	refresh: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));
vi.mock("sonner", () => ({
	toast: { success: toastSuccess, error: toastError },
}));

import { ApplicationsSection } from "./applications-section";

const item = (id: string, last: string, status = "APPLIED") => ({
	id,
	status,
	receivedAt: "2026-11-01T10:00:00Z",
	applicant: {
		id: `p-${id}`,
		firstName: "Anna",
		lastName: last,
		email: `${last.toLowerCase()}@example.com`,
		birthYear: 2010,
		hometown: "Győr",
		schoolName: "Teszt Gimi",
		duplicateFlag: false,
		newsletter: last === "Kiss",
	},
});

const fetchMock = vi.fn();

function respond(items: ReturnType<typeof item>[]) {
	fetchMock.mockImplementation((url: string, init?: RequestInit) => {
		if (init?.method === "POST")
			return Promise.resolve(
				new Response(JSON.stringify({ updated: 1, skipped: 0 }), {
					status: 200,
				}),
			);
		return Promise.resolve(
			new Response(
				JSON.stringify({
					items,
					total: items.length,
					page: 1,
					pageSize: 25,
				}),
				{ status: 200 },
			),
		);
	});
}

function renderSection(capacity = 20, accepted = 20) {
	return render(
		<ApplicationsSection
			eventId="e1"
			capacity={capacity}
			counts={overviewCounts({ ACCEPTED: accepted })}
		/>,
	);
}

describe("ApplicationsSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", fetchMock);
		respond([item("a1", "Kiss"), item("a2", "Nagy", "WAITLISTED")]);
	});

	it("lists the applications and filters by status chip", async () => {
		const user = userEvent.setup();
		renderSection();
		expect(await screen.findByText("Kiss Anna")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /^Várólista/ }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				expect.stringContaining("status=WAITLISTED"),
				expect.anything(),
			),
		);
	});

	it("states the default sort and offers a way back after changing it", async () => {
		const user = userEvent.setup();
		renderSection();
		await screen.findByText("Kiss Anna");
		expect(
			screen.getByText(/jelentkezés ideje, a régebbiek elöl/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Alapsorrend" }),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /^Név/ }));
		expect(screen.getByText(/név, növekvő/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Alapsorrend" }));
		expect(
			screen.getByText(/jelentkezés ideje, a régebbiek elöl/),
		).toBeInTheDocument();
	});

	it("selects rows without navigating and shows the bulk bar", async () => {
		const user = userEvent.setup();
		renderSection();
		await screen.findByText("Kiss Anna");
		expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		expect(push).not.toHaveBeenCalled();
		expect(
			screen.getByRole("toolbar", { name: "Tömeges műveletek" }),
		).toHaveTextContent("1 kijelölve");
		expect(
			screen.getByRole("checkbox", {
				name: "Az oldal összes jelentkezésének kijelölése",
			}),
		).toHaveAttribute("data-state", "indeterminate");
	});

	it("posts the selected ids with the chosen status and refreshes", async () => {
		const user = userEvent.setup();
		renderSection(20, 5);
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("checkbox", {
				name: "Az oldal összes jelentkezésének kijelölése",
			}),
		);
		await user.click(screen.getByRole("button", { name: "Elfogadva" }));
		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const post = fetchMock.mock.calls.find(
			([, init]) => init?.method === "POST",
		)!;
		expect(post[0]).toBe("/api/events/e1/applicants/status");
		expect(JSON.parse(post[1].body)).toEqual({
			ids: ["a1", "a2"],
			status: "ACCEPTED",
		});
		expect(toastSuccess).toHaveBeenCalled();
	});

	it("asks for confirmation when accepting would exceed the capacity", async () => {
		const user = userEvent.setup();
		renderSection(20, 20);
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		await user.click(screen.getByRole("button", { name: "Elfogadva" }));
		expect(
			await screen.findByText("Túlléped a kapacitást?"),
		).toBeInTheDocument();
		expect(
			fetchMock.mock.calls.some(([, init]) => init?.method === "POST"),
		).toBe(false);
		await user.click(
			screen.getByRole("button", { name: "Elfogadás mégis" }),
		);
		await waitFor(() => expect(refresh).toHaveBeenCalled());
	});

	it("hides the sync button when the event has no sheet", async () => {
		renderSection();
		await screen.findByText("Kiss Anna");
		expect(
			screen.queryByRole("button", { name: "Szinkronizálás most" }),
		).not.toBeInTheDocument();
	});

	it("syncs the sheet and reloads the list", async () => {
		const user = userEvent.setup();
		render(
			<ApplicationsSection
				eventId="e1"
				capacity={20}
				counts={overviewCounts()}
				applicationSheetUrl="https://docs.google.com/spreadsheets/d/x"
			/>,
		);
		await screen.findByText("Kiss Anna");
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						created: 2,
						existing: 5,
						duplicates: 0,
						errors: [],
					}),
					{ status: 200 },
				),
			),
		);
		const listCalls = fetchMock.mock.calls.length;
		await user.click(
			screen.getByRole("button", { name: "Szinkronizálás most" }),
		);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/events/e1/sync",
			expect.objectContaining({ method: "POST" }),
		);
		expect(toastSuccess).toHaveBeenCalledWith(
			"Szinkronizálva: 2 új jelentkezés, 5 már meglévő.",
		);
		expect(refresh).toHaveBeenCalled();
		await waitFor(() =>
			expect(fetchMock.mock.calls.length).toBeGreaterThan(listCalls + 1),
		);
	});

	it("collects the e-mail list for the current status filter", async () => {
		const user = userEvent.setup();
		renderSection();
		await screen.findByText("Kiss Anna");
		await user.click(screen.getByRole("button", { name: /^Várólista/ }));
		await user.click(screen.getByRole("button", { name: "E-mail lista" }));
		expect(await screen.findByRole("textbox")).toHaveValue(
			"kiss@example.com, nagy@example.com",
		);
		expect(fetchMock).toHaveBeenLastCalledWith(
			expect.stringMatching(
				/^\/api\/events\/e1\/applicants\?.*status=WAITLISTED.*/,
			),
			expect.anything(),
		);
		expect(fetchMock).toHaveBeenLastCalledWith(
			expect.stringContaining("pageSize=100"),
			expect.anything(),
		);
	});

	it("lists only the selected rows' e-mails when rows are selected", async () => {
		const user = userEvent.setup();
		renderSection();
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		const calls = fetchMock.mock.calls.length;
		await user.click(screen.getByRole("button", { name: "E-mail lista" }));
		expect(await screen.findByRole("textbox")).toHaveValue(
			"kiss@example.com",
		);
		expect(
			screen.getByText(/A kijelölt jelentkezők e-mail címe/),
		).toBeInTheDocument();
		expect(fetchMock.mock.calls.length).toBe(calls);
	});
});
