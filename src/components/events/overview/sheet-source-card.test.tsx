import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/components/applicants/test-fixtures";
import { SheetSourceCard } from "./sheet-source-card";

const { router, toast } = vi.hoisted(() => ({
	router: { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() },
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const SHEET = "https://docs.google.com/spreadsheets/d/abc/edit#gid=0";

describe("SheetSourceCard", () => {
	const fetchMock = vi.fn();

	beforeEach(() => vi.stubGlobal("fetch", fetchMock));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("points to the edit page when no sheet is set", () => {
		render(<SheetSourceCard eventId="e1" sheetUrl={null} />);
		expect(
			screen.getByRole("link", { name: "Megadás a szerkesztésnél" }),
		).toHaveAttribute("href", "/events/e1/edit");
		expect(
			screen.queryByRole("button", { name: "Szinkronizálás most" }),
		).not.toBeInTheDocument();
	});

	it("links the sheet in a new tab", () => {
		render(<SheetSourceCard eventId="e1" sheetUrl={SHEET} />);
		const link = screen.getByRole("link", {
			name: /Google Sheet megnyitása/,
		});
		expect(link).toHaveAttribute("href", SHEET);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("does not turn a non-web URL into a link", () => {
		render(<SheetSourceCard eventId="e1" sheetUrl="javascript:alert(1)" />);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
	});

	it("syncs, reports the counts and refreshes the page data", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				created: 3,
				existing: 59,
				duplicates: 1,
				errors: [],
			}),
		);
		render(<SheetSourceCard eventId="e1" sheetUrl={SHEET} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Szinkronizálás most" }),
		);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/events/e1/sync",
			expect.objectContaining({ method: "POST" }),
		);
		expect(toast.success).toHaveBeenCalledWith(
			"Szinkronizálva: 3 új jelentkezés, 59 már meglévő, 1 lehetséges duplikátum.",
		);
		expect(router.refresh).toHaveBeenCalled();
	});

	it("shows the server's message when Google sign-in is needed again", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				{
					error: "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
					code: "REAUTH_REQUIRED",
				},
				403,
			),
		);
		render(<SheetSourceCard eventId="e1" sheetUrl={SHEET} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Szinkronizálás most" }),
		);
		expect(toast.error).toHaveBeenCalledWith(
			"Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
		);
		expect(toast.success).not.toHaveBeenCalled();
		expect(router.refresh).not.toHaveBeenCalled();
	});

	it("uses a generic message for server errors", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ error: "Internal Server Error" }, 500),
		);
		render(<SheetSourceCard eventId="e1" sheetUrl={SHEET} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Szinkronizálás most" }),
		);
		expect(toast.error).toHaveBeenCalledWith(
			"A szinkronizálás nem sikerült. Próbáld újra.",
		);
	});
});
