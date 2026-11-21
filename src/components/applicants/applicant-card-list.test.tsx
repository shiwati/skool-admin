import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_COLUMN_SETTINGS,
	visibleColumns,
	type ColumnId,
} from "@/lib/applicants/column-settings";
import { ApplicantCardList } from "./applicant-card-list";
import { applicant } from "./test-fixtures";

const in2026 = new Date("2026-11-19T12:00:00Z");
const DEFAULT_COLUMNS = visibleColumns(DEFAULT_COLUMN_SETTINGS);

function renderList(
	data: Parameters<typeof ApplicantCardList>[0]["data"],
	{
		columns = DEFAULT_COLUMNS,
		filtersActive = false,
	}: { columns?: ColumnId[]; filtersActive?: boolean } = {},
) {
	const handlers = { onClearFilters: vi.fn(), onReload: vi.fn() };
	render(
		<ApplicantCardList
			data={data}
			now={in2026}
			columns={columns}
			filtersActive={filtersActive}
			{...handlers}
		/>,
	);
	return handlers;
}

const one = (overrides = {}) => ({
	status: "success" as const,
	items: [applicant(overrides)],
	total: 1,
});

const lineLabels = (card: HTMLElement) =>
	within(card)
		.queryAllByRole("term")
		.map((dt) => dt.textContent);

describe("ApplicantCardList (03.1 M)", () => {
	it("shows the header and one line per visible column (spec: Card content)", () => {
		renderList(one());
		const list = screen.getByRole("list", { name: "Jelentkezők" });
		const card = within(list).getByRole("link");
		expect(card).toHaveAttribute("href", "/applicants/a1");
		expect(card).toHaveTextContent("Nagy Luca");
		expect(card).toHaveTextContent("16+");
		expect(card).toHaveTextContent("nagy.luca@gmail.com");
		expect(lineLabels(card)).toEqual([
			"Életkor",
			"Program",
			"Státusz",
			"Település / iskola",
			"Hírlevél",
			"Előzmény",
		]);
		const values = within(card)
			.getAllByRole("definition")
			.map((dd) => dd.textContent);
		expect(values[0]).toBe("16 év");
		expect(values[1]).toContain("Python alapok – ősz");
		expect(values[2]).toBe("Elfogadva");
		expect(values[3]).toBe("Budapest · Gimnázium");
		expect(values[4]).toBe("Feliratkozott");
		expect(values[5]).toBe("1 program");
		expect(within(list).queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("shows a dash for every missing value (spec: Empty card values)", () => {
		renderList(
			one({
				birthYear: null,
				hometown: null,
				schoolName: null,
				parentFirstName: null,
				parentLastName: null,
				parentEmail: null,
				phoneNumber: null,
				newsletter: false,
				applications: [],
			}),
			{
				columns: [
					"name",
					"age",
					"program",
					"status",
					"location",
					"newsletter",
					"history",
					"createdAt",
					"parent",
					"phone",
				],
			},
		);
		const card = screen.getByRole("link");
		const lines = Object.fromEntries(
			within(card)
				.getAllByRole("term")
				.map((dt) => [
					dt.textContent,
					dt.nextElementSibling?.textContent,
				]),
		);
		for (const label of [
			"Életkor",
			"Program",
			"Státusz",
			"Település / iskola",
			"Hírlevél",
			"Előzmény",
			"Szülő",
			"Telefonszám",
		]) {
			expect(lines[label]).toBe("—");
		}
		expect(lines["Jelentkezett"]).toBe("2026.10.02");
	});

	it("leaves out the line of a hidden column", () => {
		renderList(one(), {
			columns: DEFAULT_COLUMNS.filter((id) => id !== "newsletter"),
		});
		expect(lineLabels(screen.getByRole("link"))).not.toContain("Hírlevél");
	});

	it("adds lines for extra columns in the configured order", () => {
		renderList(one(), { columns: ["name", "phone", "age"] });
		const card = screen.getByRole("link");
		expect(lineLabels(card)).toEqual(["Telefonszám", "Életkor"]);
		expect(card).toHaveTextContent("+36 30 123 4567");
	});

	it("keeps the header without body lines when only the name is visible", () => {
		renderList(one(), { columns: ["name"] });
		const card = screen.getByRole("link");
		expect(card).toHaveTextContent("Nagy Luca");
		expect(card).toHaveTextContent("16+");
		expect(card).toHaveTextContent("nagy.luca@gmail.com");
		expect(within(card).queryByRole("term")).not.toBeInTheDocument();
	});

	it("shows skeleton cards while loading", () => {
		renderList({ status: "loading" });
		expect(screen.getAllByTestId("skeleton-card")).toHaveLength(5);
		expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
	});

	it("shows the empty state with a clear action when filtering", async () => {
		const { onClearFilters } = renderList(
			{ status: "success", items: [], total: 0 },
			{ filtersActive: true },
		);
		expect(
			screen.getByText("Nincs a szűrésnek megfelelő jelentkező"),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Szűrők törlése" }),
		);
		expect(onClearFilters).toHaveBeenCalledOnce();
	});

	it("shows the error state and retries", async () => {
		const { onReload } = renderList({ status: "error" });
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Nem sikerült betölteni a listát",
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Újratöltés" }),
		);
		expect(onReload).toHaveBeenCalledOnce();
	});
});
