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
			"Lemondta0",
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

	it("links each non-empty status to the tab filtered by it", () => {
		render(<StatusBreakdown eventId="e1" counts={overviewCounts()} />);
		expect(screen.getByRole("link", { name: "Várólista" })).toHaveAttribute(
			"href",
			"/events/e1/applicants?status=WAITLISTED",
		);
		expect(
			screen.getByRole("link", { name: "Új jelentkező" }),
		).toHaveAttribute("href", "/events/e1/applicants?status=APPLIED");
		expect(
			screen.queryByRole("link", { name: "Elutasítva" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Elutasítva")).toBeInTheDocument();
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

describe("StatusBreakdown cancelled", () => {
	it("shows the cancelled applications as a status", () => {
		render(
			<StatusBreakdown
				eventId="e1"
				counts={overviewCounts({ total: 64, CANCELLED: 2 })}
			/>,
		);
		expect(screen.getByRole("link", { name: /Lemondta/ })).toHaveAttribute(
			"href",
			"/events/e1/applicants?status=CANCELLED",
		);
		expect(
			screen.getByRole("img", { name: /Lemondta: 2/ }),
		).toBeInTheDocument();
	});
});
