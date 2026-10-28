import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

type Row = { value: number };
const columns: DataTableColumn<Row>[] = [
	{ accessorKey: "value", header: "Value" },
];

describe("DataTable", () => {
	it("renders the empty state with disabled pagination", () => {
		render(<DataTable columns={columns} data={[]} caption="Test data" />);
		expect(screen.getByText("No results.")).toBeVisible();
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
	});

	it("sorts and paginates data", async () => {
		const user = userEvent.setup();
		render(
			<DataTable
				columns={columns}
				data={Array.from({ length: 11 }, (_, i) => ({ value: 11 - i }))}
				caption="Test data"
			/>,
		);
		await user.click(screen.getByRole("button", { name: /Value/ }));
		expect(screen.getAllByRole("cell")[0]).toHaveTextContent("1");
		expect(screen.getByRole("columnheader")).toHaveAttribute(
			"aria-sort",
			"ascending",
		);
		await user.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getAllByRole("cell")).toHaveLength(1);
		expect(screen.getAllByRole("cell")[0]).toHaveTextContent("11");
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Previous" }));
		expect(screen.getAllByRole("cell")).toHaveLength(10);
	});
});
