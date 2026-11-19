import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventsToolbar, yearOptions } from "./events-toolbar";

function setup(filters = {}) {
	const onChange = vi.fn();
	const onClearAll = vi.fn();
	render(
		<EventsToolbar
			filters={{ tags: [], ...filters }}
			onChange={onChange}
			onClearAll={onClearAll}
		/>,
	);
	return { onChange, onClearAll };
}

describe("yearOptions", () => {
	it("starts with next year and goes back", () => {
		expect(yearOptions(new Date("2026-11-19T12:00:00Z"))).toEqual([
			2027, 2026, 2025, 2024, 2023, 2022, 2021,
		]);
	});
});

describe("EventsToolbar", () => {
	it("sets the year from the Időszak chip", async () => {
		const { onChange } = setup();
		const year = new Date().getFullYear();
		await userEvent.click(
			screen.getByRole("button", { name: /^Időszak(?! szűrő)/ }),
		);
		await userEvent.click(
			screen.getByRole("radio", { name: String(year) }),
		);
		expect(onChange).toHaveBeenCalledWith({ year });
	});

	it("clears the year with Bármikor", async () => {
		const { onChange } = setup({ year: 2025 });
		await userEvent.click(
			screen.getByRole("button", { name: /^Időszak(?! szűrő)/ }),
		);
		await userEvent.click(screen.getByRole("radio", { name: "Bármikor" }));
		expect(onChange).toHaveBeenCalledWith({ year: undefined });
	});

	it("sets the place filter", async () => {
		const { onChange } = setup();
		await userEvent.click(
			screen.getByRole("button", { name: /Helyszín \/ partner/ }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Helyszín / partner" }),
			" Pécs ",
		);
		await userEvent.click(screen.getByRole("button", { name: "Alkalmaz" }));
		expect(onChange).toHaveBeenCalledWith({ place: "Pécs" });
	});

	it("offers Szűrők törlése only while a filter is active", async () => {
		setup();
		expect(
			screen.queryByRole("button", { name: "Szűrők törlése" }),
		).not.toBeInTheDocument();
	});
});
