import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteDialog } from "./delete-dialog";
import { jsonResponse } from "./test-fixtures";

const { toast } = vi.hoisted(() => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

describe("DeleteDialog", () => {
	const fetchMock = vi.fn();

	beforeEach(() => vi.stubGlobal("fetch", fetchMock));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	function renderDialog(
		ids = ["a1", "a2", "a3", "a4"],
		name: string | null = null,
	) {
		const onDeleted = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<DeleteDialog
				target={{ ids, name }}
				onOpenChange={onOpenChange}
				onDeleted={onDeleted}
			/>,
		);
		return { onDeleted, onOpenChange };
	}

	it("names a single applicant and explains irreversibility", () => {
		renderDialog(["a1"], "Nagy Luca");
		const dialog = screen.getByRole("alertdialog");
		expect(dialog).toHaveTextContent("Törlöd Nagy Luca adatait?");
		expect(dialog).toHaveTextContent("nem állíthatók vissza");
	});

	it("gates the delete button on the acknowledgement", async () => {
		renderDialog();
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Törlöd a kijelölt 4 jelentkezőt?",
		);
		const confirm = screen.getByRole("button", {
			name: "4 jelentkező törlése",
		});
		expect(confirm).toBeDisabled();
		await userEvent.click(
			screen.getByRole("checkbox", {
				name: "Értem, a törlés nem vonható vissza",
			}),
		);
		expect(confirm).toBeEnabled();
	});

	it("cancels without a request", async () => {
		const { onOpenChange } = renderDialog();
		await userEvent.click(screen.getByRole("button", { name: "Mégse" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("deletes, confirms with the count and notifies the parent", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ deleted: 4 }));
		const { onDeleted } = renderDialog();
		await userEvent.click(screen.getByRole("checkbox"));
		await userEvent.click(
			screen.getByRole("button", { name: "4 jelentkező törlése" }),
		);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/applicants/delete");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({
			ids: ["a1", "a2", "a3", "a4"],
		});
		expect(toast.success).toHaveBeenCalledWith("4 jelentkező törölve");
		expect(onDeleted).toHaveBeenCalledWith(4);
	});

	it("keeps the dialog open with a retryable error on failure", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ error: "x" }, 500));
		const { onDeleted } = renderDialog(["a1"], "Nagy Luca");
		await userEvent.click(screen.getByRole("checkbox"));
		await userEvent.click(screen.getByRole("button", { name: "Törlés" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A törlés nem sikerült. Próbáld újra.",
		);
		expect(onDeleted).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Törlés" })).toBeEnabled();
	});
});
