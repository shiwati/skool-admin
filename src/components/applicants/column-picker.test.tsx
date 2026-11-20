import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColumnSettings } from "@/hooks/use-column-settings";
import {
	APPLICANT_COLUMN_CONFIG,
	COLUMN_SETTINGS_KEY,
	visibleColumns,
} from "@/lib/applicants/column-settings";
import { ApplicantsTable } from "./applicants-table";
import { ColumnPicker } from "./column-picker";
import { applicant } from "./test-fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** Picker + table wired through the real browser-storage hook. */
function Harness() {
	const [settings, setSettings] = useColumnSettings(APPLICANT_COLUMN_CONFIG);
	const [, rerender] = useState(0);
	return (
		<>
			<ColumnPicker settings={settings} onChange={setSettings} />
			<button type="button" onClick={() => rerender((n) => n + 1)}>
				re-render
			</button>
			<ApplicantsTable
				data={{ status: "success", items: [applicant()], total: 1 }}
				columns={visibleColumns(settings)}
				sort="createdAt"
				order="desc"
				page={1}
				pageSize={25}
				selected={new Set()}
				filtersActive={false}
				onSort={() => {}}
				onPage={() => {}}
				onPageSize={() => {}}
				onToggleRow={() => {}}
				onToggleAll={() => {}}
				onClearFilters={() => {}}
				onReload={() => {}}
			/>
		</>
	);
}

const tableHeaders = () =>
	within(screen.getByRole("table"))
		.getAllByRole("columnheader")
		.map((th) => th.textContent);

async function openPicker() {
	await userEvent.click(screen.getByRole("button", { name: "Oszlopok" }));
	return screen.findByRole("dialog", { name: "Oszlopok a listában" });
}

describe("ColumnPicker", () => {
	afterEach(() => window.localStorage.clear());

	it("lists every column with the extra ones unticked and name locked", async () => {
		render(<Harness />);
		const panel = await openPicker();
		expect(
			within(panel).getByRole("checkbox", { name: "Telefonszám" }),
		).not.toBeChecked();
		expect(
			within(panel).getByRole("checkbox", {
				name: "Szülő neve és e-mail",
			}),
		).not.toBeChecked();
		expect(
			within(panel).getByRole("checkbox", { name: "Név / e-mail" }),
		).toBeDisabled();
	});

	it("shows the phone number column when ticked", async () => {
		render(<Harness />);
		const panel = await openPicker();
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Telefonszám" }),
		);
		expect(tableHeaders()).toContain("Telefonszám");
	});

	it("moves Hírlevél up one position with the keyboard", async () => {
		render(<Harness />);
		const panel = await openPicker();
		const before = tableHeaders();
		expect(before.indexOf("Hírlevél")).toBe(
			before.indexOf("Település / iskola") + 1,
		);
		within(panel).getByRole("button", { name: "Hírlevél feljebb" }).focus();
		await userEvent.keyboard("{Enter}");
		const after = tableHeaders();
		expect(after.indexOf("Hírlevél")).toBe(
			after.indexOf("Település / iskola") - 1,
		);
	});

	it("restores the defaults", async () => {
		render(<Harness />);
		const panel = await openPicker();
		const defaults = tableHeaders();
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Hírlevél" }),
		);
		expect(tableHeaders()).not.toContain("Hírlevél");
		await userEvent.click(
			within(panel).getByRole("button", {
				name: "Alapértelmezés visszaállítása",
			}),
		);
		expect(tableHeaders()).toEqual(defaults);
	});

	it("keeps the settings across a remount (same browser)", async () => {
		const { unmount } = render(<Harness />);
		const panel = await openPicker();
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Hírlevél" }),
		);
		expect(window.localStorage.getItem(COLUMN_SETTINGS_KEY)).toContain(
			"newsletter",
		);
		unmount();
		render(<Harness />);
		expect(tableHeaders()).not.toContain("Hírlevél");
	});
});

describe("ColumnPicker compact (mobile)", () => {
	it("opens a visibility-only panel from a 44 px icon button", async () => {
		const onChange = vi.fn();
		render(
			<ColumnPicker
				compact
				settings={{ order: ["name", "age"], hidden: [] }}
				onChange={onChange}
			/>,
		);
		const trigger = screen.getByRole("button", { name: "Oszlopok" });
		expect(trigger).toHaveClass("size-11");
		await userEvent.click(trigger);
		const panel = screen.getByRole("dialog", {
			name: "Oszlopok a listában",
		});
		// No reordering on mobile: no arrows, no drag, no drag hint.
		expect(
			within(panel).queryByRole("button", { name: /feljebb|lejjebb/ }),
		).not.toBeInTheDocument();
		expect(panel.querySelector('[draggable="true"]')).toBeNull();
		expect(panel).not.toHaveTextContent("Húzással");

		await userEvent.click(
			within(panel).getByRole("checkbox", { name: /Életkor/ }),
		);
		expect(onChange).toHaveBeenCalledWith({
			order: ["name", "age"],
			hidden: ["age"],
		});
	});
});
