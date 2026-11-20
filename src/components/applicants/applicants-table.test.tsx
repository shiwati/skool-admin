import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_COLUMN_SETTINGS,
	visibleColumns,
} from "@/lib/applicants/column-settings";
import { ApplicantsTable } from "./applicants-table";
import { pageNumbers } from "@/lib/pagination";
import { applicant, boroka } from "./test-fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const in2026 = new Date("2026-11-19T12:00:00Z");

function renderTable(
	props: Partial<ComponentProps<typeof ApplicantsTable>> = {},
) {
	const handlers = {
		onSort: vi.fn(),
		onPage: vi.fn(),
		onPageSize: vi.fn(),
		onClearFilters: vi.fn(),
		onReload: vi.fn(),
	};
	render(
		<ApplicantsTable
			data={{ status: "success", items: [applicant(), boroka], total: 2 }}
			columns={visibleColumns(DEFAULT_COLUMN_SETTINGS)}
			sort="createdAt"
			order="desc"
			page={1}
			pageSize={25}
			filtersActive={false}
			now={in2026}
			{...handlers}
			{...props}
		/>,
	);
	return handlers;
}

const headers = () =>
	screen.getAllByRole("columnheader").map((th) => th.textContent);

describe("ApplicantsTable", () => {
	it("shows the default columns in order", () => {
		renderTable();
		expect(headers()).toEqual([
			"Név / e-mail",
			"Életkor",
			"Program",
			"Státusz",
			"Település / iskola",
			"Hírlevél",
			"Előzmény",
			"Jelentkezett",
		]);
	});

	it("renders the Nagy Luca row as specified", () => {
		renderTable();
		const row = screen.getByRole("row", { name: /Nagy Luca/ });
		const cells = within(row).getAllByRole("cell");
		expect(cells[0]).toHaveTextContent("Nagy Luca");
		expect(cells[0]).toHaveTextContent("nagy.luca@gmail.com");
		expect(cells[1]).toHaveTextContent("16");
		expect(cells[1]).toHaveTextContent("16+");
		expect(cells[2]).toHaveTextContent("Python alapok – ősz");
		expect(cells[2]).toHaveTextContent("+1");
		expect(cells[3]).toHaveTextContent("Elfogadva");
		expect(cells[4]).toHaveTextContent("Budapest");
		expect(cells[4]).toHaveTextContent("Gimnázium");
		expect(within(cells[5]).getByRole("img", { name: "Feliratkozott" }));
		expect(cells[6]).toHaveTextContent("1 program");
		expect(cells[7]).toHaveTextContent("2026.10.02");
	});

	it("shows dashes for an applicant without applications", () => {
		renderTable();
		const cells = within(
			screen.getByRole("row", { name: /Kiss Boróka/ }),
		).getAllByRole("cell");
		expect(cells[1]).toHaveTextContent("13");
		expect(cells[1]).not.toHaveTextContent("16+");
		expect(cells[2]).toHaveTextContent("—");
		expect(cells[3]).toHaveTextContent("—");
		expect(cells[5]).toHaveTextContent("—");
		expect(cells[6]).toHaveTextContent("—");
	});

	it("exposes the current sort and toggles direction", async () => {
		const { onSort } = renderTable({ sort: "age", order: "asc" });
		const ageHeader = screen.getByRole("columnheader", { name: /Életkor/ });
		expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
		expect(
			screen.getByRole("columnheader", { name: /Jelentkezett/ }),
		).toHaveAttribute("aria-sort", "none");
		expect(
			screen.getByRole("columnheader", { name: "Program" }),
		).not.toHaveAttribute("aria-sort");

		await userEvent.click(within(ageHeader).getByRole("button"));
		expect(onSort).toHaveBeenLastCalledWith("age", "desc");
		await userEvent.click(
			screen.getByRole("button", { name: /Név \/ e-mail/ }),
		);
		expect(onSort).toHaveBeenLastCalledWith("name", "asc");
	});

	it("shows busy skeleton rows while loading", () => {
		renderTable({ data: { status: "loading" } });
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
		expect(screen.getAllByRole("rowgroup")[1]).toHaveAttribute(
			"aria-busy",
			"true",
		);
	});

	it("shows the empty state with a clear-filters action when filtering", async () => {
		const { onClearFilters } = renderTable({
			data: { status: "success", items: [], total: 0 },
			filtersActive: true,
		});
		const table = within(screen.getByRole("table"));
		expect(
			table.getByText("Nincs a szűrésnek megfelelő jelentkező"),
		).toBeInTheDocument();
		await userEvent.click(
			table.getByRole("button", { name: "Szűrők törlése" }),
		);
		expect(onClearFilters).toHaveBeenCalledOnce();
	});

	it("hides the clear action in the empty state without filters", () => {
		renderTable({
			data: { status: "success", items: [], total: 0 },
		});
		expect(
			screen.queryByRole("button", { name: "Szűrők törlése" }),
		).not.toBeInTheDocument();
	});

	it("shows the error state without details and retries", async () => {
		const { onReload } = renderTable({ data: { status: "error" } });
		const table = within(screen.getByRole("table"));
		expect(table.getByRole("alert")).toHaveTextContent(
			"Nem sikerült betölteni a listát",
		);
		await userEvent.click(
			table.getByRole("button", { name: "Újratöltés" }),
		);
		expect(onReload).toHaveBeenCalledOnce();
	});

	it("renders hidden columns only when enabled", () => {
		renderTable({ columns: ["name", "phone"] });
		expect(headers()).toEqual(["Név / e-mail", "Telefonszám"]);
		expect(
			screen.getByRole("row", { name: /Nagy Luca/ }),
		).toHaveTextContent("+36 30 123 4567");
	});

	it("has no selection checkboxes", () => {
		renderTable();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("has no per-row actions menu", () => {
		renderTable();
		expect(
			screen.queryByRole("button", { name: /Műveletek/ }),
		).not.toBeInTheDocument();
	});
});

describe("Pager", () => {
	it("shows the range, total and page navigation", async () => {
		const { onPage, onPageSize } = renderTable({
			data: { status: "success", items: [applicant()], total: 1248 },
			page: 2,
		});
		expect(
			screen.getByText(/26–50 \/ 1\s248 jelentkező/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "2. oldal" }),
		).toHaveAttribute("aria-current", "page");
		await userEvent.click(
			screen.getByRole("button", { name: "Következő oldal" }),
		);
		expect(onPage).toHaveBeenLastCalledWith(3);
		await userEvent.click(
			screen.getByRole("button", { name: "50. oldal" }),
		);
		expect(onPage).toHaveBeenLastCalledWith(50);
		await userEvent.selectOptions(
			screen.getByRole("combobox", { name: "Sorok / oldal" }),
			"50",
		);
		expect(onPageSize).toHaveBeenCalledWith(50);
	});

	it("disables previous on the first page", () => {
		renderTable({
			data: { status: "success", items: [applicant()], total: 30 },
		});
		expect(
			screen.getByRole("button", { name: "Előző oldal" }),
		).toBeDisabled();
	});

	it("compresses long page lists with gaps", () => {
		expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(pageNumbers(1, 50)).toEqual([1, 2, null, 50]);
		expect(pageNumbers(25, 50)).toEqual([1, null, 24, 25, 26, null, 50]);
	});
});

describe("ApplicantsTable row navigation", () => {
	const rowOf = (name: string) =>
		screen.getByRole("link", { name }).closest("tr")!;

	beforeEach(() => vi.clearAllMocks());

	it("opens the detail page when a cell is clicked", async () => {
		renderTable();
		const row = rowOf("Nagy Luca");
		await userEvent.click(within(row).getAllByRole("cell")[4]);
		expect(router.push).toHaveBeenCalledWith("/applicants/a1");
	});

	it("links the name to the detail page", () => {
		renderTable();
		expect(
			screen.getByRole("link", { name: "Kiss Boróka" }),
		).toHaveAttribute("href", "/applicants/a2");
	});

	it("does not navigate from loading or empty rows", async () => {
		renderTable({ data: { status: "loading" } });
		await userEvent.click(screen.getAllByTestId("skeleton-row")[0]);
		expect(router.push).not.toHaveBeenCalled();
	});
});

describe("ApplicantsTable responsive variants", () => {
	it("renders the table for tablet/desktop and the card list for mobile", () => {
		renderTable();
		expect(screen.getByTestId("table-frame")).toHaveClass(
			"hidden",
			"md:block",
			"overflow-x-auto",
		);
		expect(screen.getByRole("list", { name: "Jelentkezők" })).toHaveClass(
			"md:hidden",
		);
	});
});
