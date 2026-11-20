import { render, screen, waitFor } from "@testing-library/react";
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
		await screen.findByText("Nagy Luca");
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
		await screen.findByText("Nagy Luca");
		await userEvent.click(
			screen.getByRole("button", { name: /Név \/ e-mail/ }),
		);
		expect(nav.replace).toHaveBeenLastCalledWith(
			"/applicants?sort=name&order=asc",
			{ scroll: false },
		);
	});

	it("selects rows, copies their e-mails and clears on result change", async () => {
		const { rerender } = render(<ApplicantsView />);
		await screen.findByText("Nagy Luca");
		expect(
			screen.queryByRole("toolbar", { name: "Tömeges műveletek" }),
		).not.toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("checkbox", { name: "Összes kijelölése" }),
		);
		const bar = screen.getByRole("toolbar", { name: "Tömeges műveletek" });
		expect(bar).toHaveTextContent("3 kijelölve");

		await userEvent.click(
			screen.getByRole("button", { name: "E-mail címek másolása" }),
		);
		expect(writeText).toHaveBeenCalledWith(
			"nagy.luca@gmail.com, kiss.bori@freemail.hu",
		);
		expect(toast.success).toHaveBeenCalledWith(
			"2 e-mail cím a vágólapra másolva",
		);

		nav.search = "newsletter=true";
		rerender(<ApplicantsView />);
		await waitFor(() =>
			expect(
				screen.queryByRole("toolbar", { name: "Tömeges műveletek" }),
			).not.toBeInTheDocument(),
		);
	});

	it("clears the selection from the toolbar", async () => {
		render(<ApplicantsView />);
		await screen.findByText("Nagy Luca");
		await userEvent.click(
			screen.getByRole("checkbox", { name: "Kiss Boróka kijelölése" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Kijelölés megszüntetése" }),
		);
		expect(
			screen.queryByRole("toolbar", { name: "Tömeges műveletek" }),
		).not.toBeInTheDocument();
	});

	it("deletes the selection and reloads the list", async () => {
		render(<ApplicantsView />);
		await screen.findByText("Nagy Luca");
		await userEvent.click(
			screen.getByRole("checkbox", { name: "Kiss Boróka kijelölése" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Jelentkezők törlése" }),
		);
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Törlöd Kiss Boróka adatait?",
		);
		await userEvent.click(
			screen.getByRole("checkbox", {
				name: "Értem, a törlés nem vonható vissza",
			}),
		);
		const before = applicantCalls().length;
		await userEvent.click(
			screen.getAllByRole("button", { name: "Törlés" }).at(-1)!,
		);
		await waitFor(() => expect(applicantCalls().length).toBe(before + 1));
		const deleteCall = fetchMock.mock.calls.find(
			(c) => c[0] === "/api/applicants/delete",
		)!;
		expect(JSON.parse(deleteCall[1].body)).toEqual({ ids: ["a2"] });
		expect(toast.success).toHaveBeenCalledWith("1 jelentkező törölve");
		await waitFor(() =>
			expect(
				screen.queryByRole("toolbar", { name: "Tömeges műveletek" }),
			).not.toBeInTheDocument(),
		);
	});
});
