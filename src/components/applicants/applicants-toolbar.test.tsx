import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListFilters } from "@/lib/applicants/list-params";
import { SEARCH_DEBOUNCE_MS } from "@/components/list/search-field";
import { ApplicantsToolbar } from "./applicants-toolbar";

const events = [
	{ id: "e1", name: "Python alapok – ősz" },
	{ id: "e2", name: "Robotika tábor" },
];

function renderToolbar(filters: Partial<ListFilters> = {}) {
	const onChange = vi.fn();
	const onClearAll = vi.fn();
	const view = render(
		<ApplicantsToolbar
			filters={{ eventIds: [], ...filters }}
			events={events}
			years={[2026, 2025, 2024]}
			onChange={onChange}
			onClearAll={onClearAll}
		/>,
	);
	return { onChange, onClearAll, ...view };
}

describe("ApplicantsToolbar", () => {
	afterEach(() => vi.useRealTimers());

	it("debounces the search", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { onChange } = renderToolbar();
		await user.type(
			screen.getByRole("searchbox", { name: "Keresés a listában" }),
			"freemail",
		);
		expect(onChange).not.toHaveBeenCalled();
		await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({ q: "freemail" });
	});

	it("adopts an externally cleared search", () => {
		const { rerender } = renderToolbar({ q: "anna" });
		const box = screen.getByRole("searchbox");
		expect(box).toHaveValue("anna");
		rerender(
			<ApplicantsToolbar
				filters={{ eventIds: [] }}
				events={events}
				years={[2026, 2025, 2024]}
				onChange={vi.fn()}
				onClearAll={vi.fn()}
			/>,
		);
		expect(box).toHaveValue("");
	});

	it("filters by program and shows the selected program on the chip", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(
			screen.getByRole("button", { name: /^Program(?! éve)/ }),
		);
		await userEvent.click(
			await screen.findByRole("checkbox", { name: "Robotika tábor" }),
		);
		expect(onChange).toHaveBeenCalledWith({ eventIds: ["e2"] });
	});

	it("filters by the year of the program start", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(
			screen.getByRole("button", { name: /^Program éve/ }),
		);
		await userEvent.click(
			await screen.findByRole("radio", { name: "2025" }),
		);
		expect(onChange).toHaveBeenCalledWith({ programYear: 2025 });
	});

	it("shows active values and removes a single filter", async () => {
		const { onChange } = renderToolbar({
			eventIds: ["e2"],
			newsletter: true,
			hometown: "Pécs",
		});
		expect(
			screen.getByRole("button", { name: /Program: Robotika tábor/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Hírlevél: feliratkozott/ }),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Település szűrő törlése" }),
		);
		expect(onChange).toHaveBeenCalledWith({ hometown: undefined });
	});

	it("applies a valid age range", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(screen.getByRole("button", { name: /^Életkor/ }));
		await userEvent.type(await screen.findByLabelText("Minimum"), "12");
		await userEvent.type(screen.getByLabelText("Maximum"), "16");
		await userEvent.click(screen.getByRole("button", { name: "Alkalmaz" }));
		expect(onChange).toHaveBeenCalledWith({ ageFrom: 12, ageTo: 16 });
	});

	it("does not apply an inverted age range and explains why", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(screen.getByRole("button", { name: /^Életkor/ }));
		await userEvent.type(await screen.findByLabelText("Minimum"), "16");
		await userEvent.type(screen.getByLabelText("Maximum"), "12");
		await userEvent.click(screen.getByRole("button", { name: "Alkalmaz" }));
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"A minimum életkor nem lehet nagyobb a maximumnál.",
		);
	});

	it("sets the hometown, newsletter and history filters", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(
			screen.getByRole("button", { name: /^Település/ }),
		);
		await userEvent.type(
			await screen.findByRole("textbox", { name: "Település" }),
			"Győr",
		);
		await userEvent.click(screen.getByRole("button", { name: "Alkalmaz" }));
		expect(onChange).toHaveBeenCalledWith({ hometown: "Győr" });

		await userEvent.click(
			screen.getByRole("button", { name: /^Hírlevél/ }),
		);
		await userEvent.click(
			await screen.findByRole("radio", { name: "Nem iratkozott fel" }),
		);
		expect(onChange).toHaveBeenCalledWith({ newsletter: false });

		await userEvent.keyboard("{Escape}");
		await userEvent.click(
			screen.getByRole("button", { name: /^Előzmény/ }),
		);
		await userEvent.type(await screen.findByLabelText("Minimum"), "2");
		await userEvent.type(screen.getByLabelText("Maximum"), "5");
		await userEvent.click(screen.getByRole("button", { name: "Alkalmaz" }));
		expect(onChange).toHaveBeenCalledWith({
			historyFrom: 2,
			historyTo: 5,
		});
	});

	it("offers clearing all filters only when some are active", async () => {
		renderToolbar();
		expect(
			screen.queryByRole("button", { name: "Szűrők törlése" }),
		).not.toBeInTheDocument();
	});

	it("clears all filters", async () => {
		const { onClearAll } = renderToolbar({ historyFrom: 1 });
		await userEvent.click(
			screen.getByRole("button", { name: "Szűrők törlése" }),
		);
		expect(onClearAll).toHaveBeenCalledOnce();
	});
});

describe("ApplicantsToolbar on mobile", () => {
	it("keeps the inline chips and trailing items for tablet and up only", () => {
		render(
			<ApplicantsToolbar
				filters={{ eventIds: [] }}
				events={events}
				years={[2026, 2025, 2024]}
				onChange={vi.fn()}
				onClearAll={vi.fn()}
				trailing={<button>Oszlopok</button>}
			/>,
		);
		const inline = screen.getByTestId("inline-filters");
		expect(inline).toHaveClass("hidden", "md:contents");
		expect(
			screen.getByRole("button", { name: "Oszlopok" }).parentElement,
		).toBe(inline);
	});

	it("names the active filter count on the Szűrők button", () => {
		renderToolbar({ newsletter: true, hometown: "Pécs", ageFrom: 12 });
		const button = screen.getByRole("button", { name: "Szűrők (3 aktív)" });
		expect(button).toHaveClass("size-11", "md:hidden");
		expect(button).toHaveTextContent("3");
	});

	it("opens the filters dialog and applies a filter from it", async () => {
		const { onChange } = renderToolbar();
		await userEvent.click(screen.getByRole("button", { name: "Szűrők" }));
		const dialog = screen.getByRole("dialog", { name: "Szűrők" });
		await userEvent.click(
			within(dialog).getByRole("button", { name: /^Hírlevél/ }),
		);
		await userEvent.click(
			await screen.findByRole("radio", { name: "Feliratkozott" }),
		);
		expect(onChange).toHaveBeenCalledWith({ newsletter: true });
	});

	it("offers Szűrők törlése in the dialog when filters are active", async () => {
		const { onClearAll } = renderToolbar({ newsletter: true });
		await userEvent.click(
			screen.getByRole("button", { name: "Szűrők (1 aktív)" }),
		);
		const dialog = screen.getByRole("dialog", { name: "Szűrők" });
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Szűrők törlése" }),
		);
		expect(onClearAll).toHaveBeenCalledOnce();
	});
});

describe("ApplicantsToolbar mobile trailing slot", () => {
	it("renders the mobile slot after the Szűrők button, hidden from md", () => {
		render(
			<ApplicantsToolbar
				filters={{ eventIds: [] }}
				events={events}
				years={[2026, 2025, 2024]}
				onChange={vi.fn()}
				onClearAll={vi.fn()}
				mobileTrailing={<button>Oszlopok</button>}
			/>,
		);
		const slot = screen.getByTestId("mobile-trailing");
		expect(slot).toHaveClass("md:hidden");
		const filters = screen.getByRole("button", { name: "Szűrők" });
		expect(
			filters.compareDocumentPosition(slot) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
