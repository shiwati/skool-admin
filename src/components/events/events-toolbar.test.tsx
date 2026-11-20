import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { programYears } from "@/components/applicants/year-chip";
import { EventsToolbar } from "./events-toolbar";

function setup(filters = {}) {
	const onChange = vi.fn();
	const onClearAll = vi.fn();
	render(
		<EventsToolbar
			filters={{ tags: [], ...filters }}
			years={[new Date().getFullYear(), 2025, 2024]}
			onChange={onChange}
			onClearAll={onClearAll}
		/>,
	);
	return { onChange, onClearAll };
}

describe("programYears", () => {
	const now = new Date("2026-11-19T12:00:00Z");

	it("spans from the latest to the earliest program year", () => {
		expect(programYears({ first: 2024, last: 2027 }, now)).toEqual([
			2027, 2026, 2025, 2024,
		]);
	});

	it("always includes the current year", () => {
		expect(programYears({ first: null, last: null }, now)).toEqual([2026]);
		expect(programYears({ first: 2023, last: 2024 }, now)).toEqual([
			2026, 2025, 2024, 2023,
		]);
	});
});

describe("EventsToolbar", () => {
	it("sets the year from the Program éve chip", async () => {
		const { onChange } = setup();
		const year = new Date().getFullYear();
		await userEvent.click(
			screen.getByRole("button", { name: /^Program éve(?! szűrő)/ }),
		);
		await userEvent.click(
			screen.getByRole("radio", { name: String(year) }),
		);
		expect(onChange).toHaveBeenCalledWith({ year });
	});

	it("clears the year with Bármikor", async () => {
		const { onChange } = setup({ year: 2025 });
		await userEvent.click(
			screen.getByRole("button", { name: /^Program éve(?! szűrő)/ }),
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

describe("YearChip", () => {
	it("keeps an out-of-range selected year visible", async () => {
		const { onChange } = setup({ year: 2019 });
		await userEvent.click(
			screen.getByRole("button", { name: /^Program éve(?! szűrő)/ }),
		);
		expect(screen.getByRole("radio", { name: "2019" })).toBeChecked();
		await userEvent.click(screen.getByRole("radio", { name: "2024" }));
		expect(onChange).toHaveBeenCalledWith({ year: 2024 });
	});
});
