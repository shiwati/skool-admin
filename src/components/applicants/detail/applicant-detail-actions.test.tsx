import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test-fixtures";
import { ApplicantDetailActions } from "./applicant-detail-actions";

const { router, toast } = vi.hoisted(() => ({
	router: { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() },
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

describe("ApplicantDetailActions", () => {
	const fetchMock = vi.fn();

	beforeEach(() => vi.stubGlobal("fetch", fetchMock));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	async function openDelete() {
		render(<ApplicantDetailActions id="a1" name="Nagy Luca" />);
		await userEvent.click(
			screen.getByRole("button", { name: "További műveletek" }),
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Törlés" }));
		await userEvent.click(
			screen.getByRole("checkbox", {
				name: "Értem, a törlés nem vonható vissza",
			}),
		);
	}

	it("shows confirmation and edit as disabled", () => {
		render(<ApplicantDetailActions id="a1" name="Nagy Luca" />);
		for (const name of [/Visszaigazolás küldése/, /Szerkesztés/]) {
			const button = screen.getByRole("button", { name });
			expect(button).toBeDisabled();
			expect(button).toHaveAccessibleDescription("Hamarosan elérhető.");
		}
	});

	it("opens the deletion confirmation naming the applicant", async () => {
		render(<ApplicantDetailActions id="a1" name="Nagy Luca" />);
		await userEvent.click(
			screen.getByRole("button", { name: "További műveletek" }),
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Törlés" }));
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Törlöd Nagy Luca adatait?",
		);
	});

	it("returns to the list after a successful deletion", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ deleted: 1 }));
		await openDelete();
		await userEvent.click(screen.getByRole("button", { name: "Törlés" }));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/applicants/delete",
			expect.objectContaining({ body: JSON.stringify({ ids: ["a1"] }) }),
		);
		expect(toast.success).toHaveBeenCalledWith("1 jelentkező törölve");
		expect(router.replace).toHaveBeenCalledWith("/applicants");
		expect(router.refresh).toHaveBeenCalled();
	});

	it("stays on the page when the deletion fails", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ error: "x" }, 500));
		await openDelete();
		await userEvent.click(screen.getByRole("button", { name: "Törlés" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A törlés nem sikerült. Próbáld újra.",
		);
		expect(router.replace).not.toHaveBeenCalled();
	});
});
