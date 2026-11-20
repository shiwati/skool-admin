import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { overviewCounts } from "./test-fixtures";
import { StatusBreakdown } from "./status-breakdown";

describe("StatusBreakdown", () => {
	it("lists every status with its count and links to the applicants tab", () => {
		render(<StatusBreakdown eventId="e1" counts={overviewCounts()} />);
		expect(screen.getByText("62 jelentkezés")).toBeInTheDocument();
		const items = screen.getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"Új jelentkező24",
			"Elfogadva20",
			"Várólista18",
			"Részt vett0",
			"Elutasítva0",
		]);
		expect(
			screen.getByRole("img", {
				name: /Új jelentkező: 24, Elfogadva: 20/,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Jelentkezők megtekintése" }),
		).toHaveAttribute("href", "/events/e1/applicants");
	});

	it("shows an empty state instead of the bar without applications", () => {
		render(
			<StatusBreakdown
				eventId="e1"
				counts={overviewCounts({
					total: 0,
					APPLIED: 0,
					ACCEPTED: 0,
					WAITLISTED: 0,
				})}
			/>,
		);
		expect(
			screen.getByText("Még nincs jelentkező ehhez a programhoz."),
		).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
