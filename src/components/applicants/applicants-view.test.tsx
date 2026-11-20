import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicantsView } from "./applicants-view";
import {
	applicant,
	boroka,
	jsonResponse,
	noEmail,
	pageOf,
} from "./test-fixtures";

const nav = vi.hoisted(() => ({
	replace: vi.fn(),
	search: "",
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: nav.replace }),
	usePathname: () => "/applicants",
	useSearchParams: () => new URLSearchParams(nav.search),
}));

const { toast } = vi.hoisted(() => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

const items = [applicant(), boroka, noEmail];

describe("ApplicantsView", () => {
	const fetchMock = vi.fn();
	const writeText = vi.fn();

	beforeEach(() => {
		nav.search = "";
		vi.stubGlobal("fetch", fetchMock);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		writeText.mockResolvedValue(undefined);
		fetchMock.mockImplementation(
			async (url: string, init?: RequestInit) => {
				if (url.startsWith("/api/events"))
					return jsonResponse({
						items: [{ id: "e2", name: "Robotika tábor" }],
					});
				if (url === "/api/applicants/delete" && init?.method === "POST")
					return jsonResponse({ deleted: 1 });
				return jsonResponse(pageOf(items, 3));
			},
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
		window.localStorage.clear();
	});

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
		render(<ApplicantsView />);
		await screen.findByRole("row", { name: /Nagy Luca/ });
		await userEvent.click(screen.getByRole("button", { name: /^Program/ }));
		await userEvent.click(
			await screen.findByRole("checkbox", { name: "Robotika tábor" }),
		);
		expect(nav.replace).toHaveBeenLastCalledWith(
			"/applicants?eventIds=e2",
			{ scroll: false },
		);
	});

	it("writes sorting to the URL", async () => {
		render(<ApplicantsView />);
		await screen.findByRole("row", { name: /Nagy Luca/ });
		await userEvent.click(
			screen.getByRole("button", { name: /Név \/ e-mail/ }),
		);
		expect(nav.replace).toHaveBeenLastCalledWith(
			"/applicants?sort=name&order=asc",
			{ scroll: false },
		);
	});
});

describe("ApplicantsView column settings on mobile", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		nav.search = "";
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockImplementation(async (url: string) =>
			url.startsWith("/api/events")
				? jsonResponse({ items: [] })
				: jsonResponse(pageOf(items, 3)),
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
