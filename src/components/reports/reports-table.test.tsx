import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReportListItem } from "@/lib/reports/list";
import { ReportsTable } from "./reports-table";

const done: ReportListItem = {
	eventId: "e1",
	name: "Python alapok – ősz",
	companyName: "Sigma Technology",
	to: new Date("2026-10-12T15:00:00Z"),
	documents: 2,
	lastGeneratedAt: new Date("2026-10-20T09:30:00Z"),
	lastGeneratedBy: "Kiss Anna",
};

const todo: ReportListItem = {
	eventId: "e2",
	name: "Robotika nyári tábor",
	companyName: null,
	to: new Date("2026-08-01T15:00:00Z"),
	documents: 0,
	lastGeneratedAt: null,
	lastGeneratedBy: null,
};

describe("ReportsTable", () => {
	it("renders a card per program for mobile", () => {
		render(<ReportsTable rows={[done, todo]} />);
		const list = screen.getByRole("list", { name: "Riportok" });
		expect(list).toHaveClass("md:hidden");
		const [first, second] = within(list).getAllByRole("listitem");

		expect(first).toHaveTextContent("Python alapok – ősz");
		expect(first).toHaveTextContent("Sigma Technology");
		expect(
			within(first)
				.getAllByRole("term")
				.map((dt) => dt.textContent),
		).toEqual(["Lezárva", "Riport állapota", "Utolsó generálás"]);
		expect(first).toHaveTextContent("Docs kész (2)");
		expect(first).toHaveTextContent(/Kiss Anna · /);
		expect(
			within(first).getByRole("link", { name: "Riport megnyitása" }),
		).toHaveAttribute("href", expect.stringContaining("e1"));

		expect(second).toHaveTextContent("Nincs elkészítve");
		expect(
			within(second).getByRole("link", { name: "Riport készítése" }),
		).toHaveClass("w-full", "h-11");
	});

	it("keeps the table for tablet and up, in a positioned scroll frame", () => {
		render(<ReportsTable rows={[done]} />);
		const frame = screen.getByTestId("reports-table-frame");
		expect(frame).toHaveClass("relative", "hidden", "md:block");
		const table = within(frame).getByRole("table", { name: "Riportok" });
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((th) => th.textContent),
		).toEqual([
			"Program",
			"Lezárva",
			"Riport állapota",
			"Utolsó generálás",
			"Művelet",
		]);
	});
});
