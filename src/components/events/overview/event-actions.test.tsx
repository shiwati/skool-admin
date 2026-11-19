import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/components/applicants/test-fixtures";
import { EventActions } from "./event-actions";

const { router, toast } = vi.hoisted(() => ({
	router: { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() },
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const target = { id: "e1", name: "Python alapok – ősz", applications: 62 };

describe("EventActions", () => {
	const fetchMock = vi.fn();

	beforeEach(() => vi.stubGlobal("fetch", fetchMock));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("links the edit button to the editor", () => {
		render(<EventActions target={target} />);
		expect(
			screen.getByRole("link", { name: /Szerkesztés/ }),
		).toHaveAttribute("href", "/events/e1/edit");
	});

	it("deletes after the acknowledgement and returns to the list", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: "e1" }));
		render(<EventActions target={target} />);
		await userEvent.click(
			screen.getByRole("button", { name: "További műveletek" }),
		);
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Program törlése" }),
		);
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Törlöd a(z) Python alapok – ősz programot?",
		);
		await userEvent.click(
			screen.getByRole("checkbox", {
				name: "Értem, a törlés nem vonható vissza",
			}),
		);
		await userEvent.click(screen.getByRole("button", { name: "Törlés" }));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/events/e1",
			expect.objectContaining({ method: "DELETE" }),
		);
		expect(router.replace).toHaveBeenCalledWith("/events");
		expect(router.refresh).toHaveBeenCalled();
	});
});
