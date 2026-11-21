import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseListState, toApiQuery } from "@/lib/applicants/list-params";
import { ApplicantsView } from "./applicants-view";
import {
	applicant,
	boroka,
	jsonResponse,
	noEmail,
	pageOf,
} from "./test-fixtures";

const nav = vi.hoisted(() => ({
	search: "",
}));
vi.mock("next/navigation", () => ({
	// Rows navigate to the detail page; the list itself never uses the router.
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/applicants",
	useSearchParams: () => new URLSearchParams(nav.search),
}));

const { toast } = vi.hoisted(() => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

const items = [applicant(), boroka, noEmail];
const events = [{ id: "e2", name: "Robotika tábor" }];

describe("ApplicantsView", () => {
	const fetchMock = vi.fn();
	const writeText = vi.fn();

	let replaceState: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		nav.search = "";
		vi.stubGlobal("fetch", fetchMock);
		replaceState = vi
			.spyOn(window.history, "replaceState")
			.mockImplementation(() => {});
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		writeText.mockResolvedValue(undefined);
		fetchMock.mockImplementation(
			async (url: string, init?: RequestInit) => {
				if (url === "/api/applicants/delete" && init?.method === "POST")
					return jsonResponse({ deleted: 1 });
				return jsonResponse(pageOf(items, 3));
			},
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.resetAllMocks();
		window.localStorage.clear();
	});

	const fetchedUrls = () => fetchMock.mock.calls.map((c) => c[0] as string);

	const applicantCalls = () =>
		fetchMock.mock.calls
			.map((c) => c[0] as string)
			.filter((u) => u.startsWith("/api/applicants?"))
			.map((u) => new URL(u, "http://x").searchParams);

	it("requests the API query derived from the URL and shows the total", async () => {
		nav.search = "sort=age&order=asc&page=2&hometown=P%C3%A9cs";
		render(<ApplicantsView />);
		expect(
			await screen.findByText("Találatok száma: 3 fő"),
		).toBeInTheDocument();
		const query = applicantCalls()[0];
		expect(Object.fromEntries(query)).toEqual({
			page: "2",
			pageSize: "25",
			sort: "birthYear",
			order: "desc",
			hometown: "Pécs",
		});
	});

	it("writes filter changes to the URL and returns to page 1", async () => {
		nav.search = "page=3";
		render(<ApplicantsView events={events} />);
		await screen.findByRole("row", { name: /Nagy Luca/ });
		await userEvent.click(
			screen.getByRole("button", { name: /^Program(?! éve)/ }),
		);
		await userEvent.click(
			await screen.findByRole("checkbox", { name: "Robotika tábor" }),
		);
		expect(replaceState).toHaveBeenLastCalledWith(
			null,
			"",
			"/applicants?eventIds=e2",
		);
	});

	it("writes sorting to the URL", async () => {
		render(<ApplicantsView />);
		await screen.findByRole("row", { name: /Nagy Luca/ });
		await userEvent.click(
			screen.getByRole("button", { name: /Név \/ e-mail/ }),
		);
		expect(replaceState).toHaveBeenLastCalledWith(
			null,
			"",
			"/applicants?sort=name&order=asc",
		);
	});

	it("uses the server-rendered first page, programs and duplicate count without fetching", () => {
		nav.search = "eventIds=e2";
		render(
			<ApplicantsView
				initial={{
					apiQuery: toApiQuery(
						parseListState(new URLSearchParams(nav.search)),
					).toString(),
					data: pageOf(items, 3),
				}}
				events={events}
				duplicateCount={2}
			/>,
		);
		expect(screen.getByText("Találatok száma: 3 fő")).toBeInTheDocument();
		expect(
			screen.getByText(/2 lehetséges duplikált jelentkezés/),
		).toBeInTheDocument();
		// The active program chip names the program from the server's list.
		expect(screen.getAllByText(/Robotika tábor/).length).toBeGreaterThan(0);
		expect(fetchedUrls()).toEqual([]);
	});

	it("shows no duplicate banner when the count is unknown", async () => {
		render(<ApplicantsView events={events} duplicateCount={null} />);
		await screen.findByRole("row", { name: /Nagy Luca/ });
		expect(
			screen.queryByText(/lehetséges duplikált jelentkezés/),
		).not.toBeInTheDocument();
		expect(
			fetchedUrls().every((u) => u.startsWith("/api/applicants?")),
		).toBe(true);
	});
});

describe("ApplicantsView column settings on mobile", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		nav.search = "";
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockImplementation(async () =>
			jsonResponse(pageOf(items, 3)),
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
		window.localStorage.clear();
	});

	it("hides a column in both the cards and the table from the compact picker", async () => {
		render(<ApplicantsView />);
		const list = await screen.findByRole("list", { name: "Jelentkezők" });
		await waitFor(() =>
			expect(
				within(list).getAllByText("Hírlevél").length,
			).toBeGreaterThan(0),
		);
		const mobile = screen.getByTestId("mobile-trailing");
		expect(mobile).toHaveClass("md:hidden");
		await userEvent.click(
			within(mobile).getByRole("button", { name: "Oszlopok" }),
		);
		const panel = await screen.findByRole("dialog", {
			name: "Oszlopok a listában",
		});
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: /^Hírlevél/ }),
		);
		expect(within(list).queryByText("Hírlevél")).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("table"))
				.getAllByRole("columnheader")
				.map((th) => th.textContent),
		).not.toContain("Hírlevél");
	});
});
