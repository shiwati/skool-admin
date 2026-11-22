import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TAG_BADGE_CLASSES } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import type {
	EventApplicationItem,
	InitialApplications,
} from "@/lib/events/applications";
import {
	DEFAULT_APPLICATIONS_VIEW,
	toApplicationsApiQuery,
} from "@/lib/events/applications-params";
import { overviewCounts } from "./test-fixtures";

const { push, refresh, toastSuccess, toastError, nav } = vi.hoisted(() => {
	// URL store: `useSearchParams` re-renders when `replaceState` writes it,
	// as Next does for the native history API.
	let search = "";
	const listeners = new Set<() => void>();
	return {
		push: vi.fn(),
		refresh: vi.fn(),
		toastSuccess: vi.fn(),
		toastError: vi.fn(),
		nav: {
			get: () => search,
			set(next: string) {
				search = next;
				listeners.forEach((l) => l());
			},
			subscribe(listener: () => void) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		},
	};
});
vi.mock("next/navigation", async () => {
	const { useSyncExternalStore } = await import("react");
	return {
		useRouter: () => ({ push, refresh, replace: vi.fn() }),
		useSearchParams: () =>
			new URLSearchParams(useSyncExternalStore(nav.subscribe, nav.get)),
	};
});
vi.mock("sonner", () => ({
	toast: { success: toastSuccess, error: toastError },
}));

import { ApplicationsSection } from "./applications-section";

const item = (
	id: string,
	last: string,
	status: ApplicationStatus = "APPLIED",
): EventApplicationItem => ({
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

function renderSection(
	capacity = 20,
	accepted = 20,
	props: Partial<ComponentProps<typeof ApplicationsSection>> = {},
) {
	return render(
		<ApplicationsSection
			eventId="e1"
			capacity={capacity}
			counts={overviewCounts({ ACCEPTED: accepted })}
			{...props}
		/>,
	);
}

const DEFAULT_API_QUERY = toApplicationsApiQuery(
	DEFAULT_APPLICATIONS_VIEW,
).toString();

function initialOf(
	items: EventApplicationItem[],
	apiQuery = DEFAULT_API_QUERY,
): InitialApplications {
	return {
		apiQuery,
		data: { items, total: items.length, page: 1, pageSize: 25 },
	};
}

const listCalls = () =>
	fetchMock.mock.calls
		.map(([url]) => url as string)
		.filter((url) => url.startsWith("/api/events/e1/applicants?"));

describe("ApplicationsSection", () => {
	let replaceState: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		nav.set("");
		vi.stubGlobal("fetch", fetchMock);
		replaceState = vi
			.spyOn(window.history, "replaceState")
			.mockImplementation((_state, _title, url) => {
				nav.set(new URL(String(url), "http://x").search.slice(1));
			});
		respond([item("a1", "Kiss"), item("a2", "Nagy", "WAITLISTED")]);
	});
	afterEach(() => {
		replaceState.mockRestore();
		vi.unstubAllGlobals();
	});

	const lastUrl = () => replaceState.mock.lastCall?.[2];

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

	it("colours the 16+ badge like every other surface", async () => {
		renderSection();
		await screen.findByText("Kiss Anna");
		const badge = screen.getAllByText("16+")[0];
		for (const cls of TAG_BADGE_CLASSES.over16.split(" ")) {
			expect(badge).toHaveClass(cls);
		}
	});

	it("writes the status filter to the URL and returns to page 1", async () => {
		const user = userEvent.setup();
		nav.set("page=3");
		renderSection();
		await screen.findByText("Kiss Anna");
		await user.click(screen.getByRole("button", { name: /^Elfogadva/ }));
		expect(lastUrl()).toBe("/events/e1/applicants?status=ACCEPTED");
		await waitFor(() =>
			expect(listCalls().at(-1)).toBe(
				"/api/events/e1/applicants?sort=receivedAt&order=asc&page=1&pageSize=25&status=ACCEPTED",
			),
		);
	});

	it("restores the view from the URL", async () => {
		nav.set("status=WAITLISTED&page=2");
		renderSection();
		await screen.findByText("Kiss Anna");
		expect(listCalls()).toEqual([
			"/api/events/e1/applicants?sort=receivedAt&order=asc&page=2&pageSize=25&status=WAITLISTED",
		]);
		expect(
			screen.getByRole("button", { name: /^Várólista/ }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("leaves the URL clean for the default view", async () => {
		const user = userEvent.setup();
		nav.set("status=ACCEPTED");
		renderSection();
		await screen.findByText("Kiss Anna");
		await user.click(screen.getByRole("button", { name: /^Mind/ }));
		expect(lastUrl()).toBe("/events/e1/applicants");
	});

	it("sorts by age as youngest first", async () => {
		const user = userEvent.setup();
		renderSection();
		await screen.findByText("Kiss Anna");
		await user.click(screen.getByRole("button", { name: /^Kor/ }));
		expect(lastUrl()).toBe("/events/e1/applicants?sort=age");
		expect(screen.getByText(/kor, növekvő/)).toBeInTheDocument();
		await waitFor(() =>
			expect(listCalls().at(-1)).toContain("sort=birthYear&order=desc"),
		);
	});

	it("shows the server-rendered view without fetching", async () => {
		nav.set("status=WAITLISTED");
		const view = {
			...DEFAULT_APPLICATIONS_VIEW,
			status: "WAITLISTED" as const,
		};
		renderSection(20, 20, {
			initial: initialOf(
				[item("a2", "Nagy", "WAITLISTED")],
				toApplicationsApiQuery(view).toString(),
			),
		});
		expect(screen.getByText("Nagy Anna")).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fetches when the server-rendered page answers another view", async () => {
		nav.set("page=2");
		renderSection(20, 20, { initial: initialOf([item("a1", "Kiss")]) });
		await waitFor(() => expect(listCalls()).toHaveLength(1));
		expect(listCalls()[0]).toContain("page=2");
	});

	it("reloads only through the server after a status change", async () => {
		const user = userEvent.setup();
		const { rerender } = renderSection(20, 5, {
			initial: initialOf([item("a1", "Kiss")]),
		});
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		await user.click(screen.getByRole("button", { name: "Elfogadva" }));
		await waitFor(() => expect(refresh).toHaveBeenCalled());
		expect(listCalls()).toEqual([]);
		// The refreshed page brings the new data.
		rerender(
			<ApplicationsSection
				eventId="e1"
				capacity={20}
				counts={overviewCounts({ ACCEPTED: 6 })}
				initial={initialOf([item("a1", "Kiss", "ACCEPTED")])}
			/>,
		);
		expect(
			screen.getByRole("row", { name: /Kiss Anna/ }),
		).toHaveTextContent("Elfogadva");
		expect(listCalls()).toEqual([]);
	});

	it("fetches from the client when the refreshed page has no data", async () => {
		const { rerender } = renderSection(20, 5, {
			initial: initialOf([item("a1", "Kiss")]),
		});
		rerender(
			<ApplicationsSection
				eventId="e1"
				capacity={20}
				counts={overviewCounts({ ACCEPTED: 5 })}
			/>,
		);
		await waitFor(() => expect(listCalls()).toHaveLength(1));
	});

	it("retries from the client after a load error", async () => {
		const user = userEvent.setup();
		const list = fetchMock.getMockImplementation()!;
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(new Response("{}", { status: 500 })),
		);
		renderSection();
		await user.click(
			await screen.findByRole("button", { name: "Újratöltés" }),
		);
		fetchMock.mockImplementation(list);
		expect(await screen.findByText("Kiss Anna")).toBeInTheDocument();
		expect(listCalls()).toHaveLength(2);
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
		expect(toastSuccess).toHaveBeenCalledWith(
			"1 jelentkezés státusza: Elfogadva",
		);
	});

	it("changes one row's status from its menu (spec scenario)", async () => {
		const user = userEvent.setup();
		renderSection(20, 5);
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("button", {
				name: "Kiss Anna státusza: Új jelentkező. Módosítás",
			}),
		);
		await user.click(screen.getByRole("menuitem", { name: "Várólista" }));
		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const post = fetchMock.mock.calls.find(
			([, init]) => init?.method === "POST",
		)!;
		expect(JSON.parse(post[1].body)).toEqual({
			ids: ["a1"],
			status: "WAITLISTED",
		});
		expect(push).not.toHaveBeenCalled();
	});

	it("turns the active status chip off (spec scenario)", async () => {
		const user = userEvent.setup();
		nav.set("status=WAITLISTED");
		renderSection();
		await screen.findByText("Nagy Anna");
		await user.click(screen.getByRole("button", { name: /^Várólista/ }));
		expect(lastUrl()).toBe("/events/e1/applicants");
	});

	it("shows the filtered empty state with Szűrő törlése (spec scenario)", async () => {
		const user = userEvent.setup();
		respond([]);
		nav.set("status=REJECTED");
		renderSection();
		expect(
			await screen.findByText(
				/Nincs a szűrésnek megfelelő jelentkezés\./,
			),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Szűrő törlése" }));
		expect(lastUrl()).toBe("/events/e1/applicants");
	});

	it("shows the empty state of a program without applications", async () => {
		respond([]);
		renderSection();
		expect(
			await screen.findByText("Még nincs jelentkező ehhez a programhoz."),
		).toBeInTheDocument();
	});

	it("shows an error toast when the status change fails", async () => {
		const user = userEvent.setup();
		const list = fetchMock.getMockImplementation()!;
		fetchMock.mockImplementation((url: string, init?: RequestInit) =>
			init?.method === "POST"
				? Promise.resolve(
						new Response(JSON.stringify({ error: "x" }), {
							status: 500,
						}),
					)
				: list(url, init),
		);
		renderSection(20, 5);
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		await user.click(screen.getByRole("button", { name: "Elfogadva" }));
		await waitFor(() =>
			expect(toastError).toHaveBeenCalledWith(
				"A státusz módosítása nem sikerült. Próbáld újra.",
			),
		);
		expect(toastSuccess).not.toHaveBeenCalled();
	});

	it("does not warn about capacity when the program has no limit", async () => {
		const user = userEvent.setup();
		renderSection(0, 20);
		await screen.findByText("Kiss Anna");
		await user.click(
			screen.getByRole("checkbox", { name: "Kiss Anna kijelölése" }),
		);
		await user.click(screen.getByRole("button", { name: "Elfogadva" }));
		await waitFor(() => expect(refresh).toHaveBeenCalled());
		expect(screen.queryByText("Túlléped a kapacitást?")).toBeNull();
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
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"A művelet után 21 elfogadott jelentkező lenne, a program kapacitása 20.",
		);
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

	it("syncs the sheet and reloads the page", async () => {
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
		const before = listCalls().length;
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
		// The list comes back with the refreshed page, not from the client.
		expect(refresh).toHaveBeenCalled();
		expect(listCalls()).toHaveLength(before);
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
