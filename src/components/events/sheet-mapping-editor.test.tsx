import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/api/client")>()),
	apiFetch,
}));

import { ApiError } from "@/lib/api/client";
import { SheetMappingEditor } from "./sheet-mapping-editor";

const URL = "https://docs.google.com/spreadsheets/d/abc123/edit";
const HEADERS = ["Időbélyeg", "Vezetéknév", "Keresztnév", "E-mail címed"];

function renderEditor(
	props: Partial<React.ComponentProps<typeof SheetMappingEditor>> = {},
) {
	const onChange = vi.fn();
	render(
		<SheetMappingEditor
			kind="application"
			value={null}
			onChange={onChange}
			url={URL}
			urlValid
			{...(props as object)}
		/>,
	);
	return { onChange, user: userEvent.setup() };
}

const trigger = () =>
	screen.getByRole("button", { name: /Mező-megfeleltetés/ });
const loadButton = () =>
	screen.getByRole("button", { name: "Fejlécek betöltése a sheetből" });

describe("SheetMappingEditor", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		apiFetch.mockResolvedValue({ headers: HEADERS });
	});

	it("is marked as default without a saved mapping", async () => {
		const { user } = renderEditor();
		expect(trigger()).toHaveTextContent("Alapértelmezett");
		await user.click(trigger());
		expect(
			screen.queryByRole("button", {
				name: "Visszaállítás alapértelmezésre",
			}),
		).not.toBeInTheDocument();
	});

	it("disables loading headers until the link is valid", async () => {
		const { user } = renderEditor({ urlValid: false });
		await user.click(trigger());
		expect(loadButton()).toBeDisabled();
	});

	it("loads the headers and preselects the default matching", async () => {
		const { user } = renderEditor();
		await user.click(trigger());
		await user.click(loadButton());
		expect(apiFetch).toHaveBeenCalledWith(
			"/api/sheets/headers",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ url: URL }),
			}),
		);
		const email = await screen.findByLabelText(/^E-mail/);
		expect(email).toHaveValue("E-mail címed");
		const school = screen.getByLabelText("Iskola");
		expect(school).toHaveValue("");
		expect(
			within(school)
				.getAllByRole("option")
				.map((o) => o.textContent),
		).toEqual(["— nincs hozzárendelve —", ...HEADERS]);
	});

	it("marks a saved mapping as custom and shows headers missing from the sheet", async () => {
		const { user } = renderEditor({
			value: {
				lastName: "Vezetéknév",
				firstName: "Keresztnév",
				email: "E-mail cím",
			},
		});
		expect(trigger()).toHaveTextContent("Egyéni");
		await user.click(trigger());
		await user.click(loadButton());
		const email = await screen.findByLabelText(/^E-mail/);
		expect(email).toHaveValue("E-mail cím");
		expect(
			screen.getByRole("option", {
				name: "E-mail cím (nincs a sheetben)",
			}),
		).toBeInTheDocument();
		expect(email).toHaveAttribute("aria-invalid", "true");
	});

	it("resets a saved mapping to the default", async () => {
		const { user, onChange } = renderEditor({
			value: { lastName: "A", firstName: "B", email: "C" },
		});
		await user.click(trigger());
		await user.click(
			screen.getByRole("button", {
				name: "Visszaállítás alapértelmezésre",
			}),
		);
		expect(onChange).toHaveBeenCalledWith(null);
	});

	it("shows the endpoint's message when loading fails", async () => {
		apiFetch.mockRejectedValue(
			new ApiError(403, {
				error: "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
				code: "REAUTH_REQUIRED",
			}),
		);
		const { user } = renderEditor();
		await user.click(trigger());
		await user.click(loadButton());
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
		);
	});

	it("falls back to a generic message when loading fails otherwise", async () => {
		apiFetch.mockRejectedValue(new TypeError("Failed to fetch"));
		const { user } = renderEditor();
		await user.click(trigger());
		await user.click(loadButton());
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A fejlécek betöltése nem sikerült.",
		);
	});

	it("adds and removes custom feedback questions once headers are loaded", async () => {
		const value = {
			columns: { timestamp: "Időbélyeg" },
			custom: [{ label: "Pizza", kind: "text" as const, header: "P" }],
		};
		const { user, onChange } = renderEditor({ kind: "MENTOR", value });
		await user.click(trigger());
		const add = screen.getByRole("button", { name: "Új kérdés" });
		expect(add).toBeDisabled();

		await user.click(loadButton());
		await screen.findByRole("button", { name: "Fejlécek újratöltése" });
		await user.click(add);
		expect(onChange).toHaveBeenLastCalledWith({
			columns: value.columns,
			custom: [...value.custom, { label: "", kind: "text", header: "" }],
		});

		await user.click(
			screen.getByRole("button", { name: "1. egyéni kérdés törlése" }),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			columns: value.columns,
			custom: [],
		});
	});
});
