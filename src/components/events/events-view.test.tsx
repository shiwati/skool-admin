import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventListItem } from "./events-table";
import { EventsView } from "./events-view";

const nav = vi.hoisted(() => ({ replace: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: nav.replace }),
	usePathname: () => "/events",
	useSearchParams: () => new URLSearchParams(nav.search),
}));

const now = "2026-11-19T12:00:00.000Z";

function event(overrides: Partial<EventListItem> = {}): EventListItem {
	return {
		id: "e1",
		name: "Python alapok – ősz",
		from: "2026-11-21T09:00:00.000Z",
		to: "2026-12-12T15:00:00.000Z",
		companyName: "Sigma Technology",
		location: "Budapest",
		sheetUrl: "https://docs.google.com/spreadsheets/d/x",
		instructor: "Kiss Bence",
		mentors: ["Szabó Petra", "Tóth Anna"],
		tags: ["programozás"],
		capacity: 20,
		applicationCounts: { total: 62 },
		...overrides,
	};
}

const counts = { active: 9, planned: 6, closed: 9, all: 24 };

describe("EventsView", () => {
	beforeEach(() => {
		nav.search = "";
		nav.replace.mockReset();
	});

	it("renders the header, tabs and a row", () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Programok és események" }),
		).toBeInTheDocument();
		expect(screen.getByText(/24 program · 9 aktív/)).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /^Aktív\s*9$/ }),
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("link", { name: "Új program" }),
		).toHaveAttribute("href", "/events/new");

		const row = screen.getAllByRole("row")[1];
		expect(
			within(row).getByRole("link", { name: "Python alapok – ősz" }),
		).toHaveAttribute("href", "/events/e1");
		expect(within(row).getByText("11.21 – 12.12")).toBeInTheDocument();
		expect(within(row).getByText("62 / 20 fő")).toBeInTheDocument();
		expect(within(row).getByText("3,1×")).toBeInTheDocument();
		expect(within(row).getByText("Betelt · várólista")).toBeInTheDocument();
		expect(within(row).getByText("+1")).toBeInTheDocument();
	});

	it("switches tab through the URL and resets the page", async () => {
		nav.search = "page=2";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		await userEvent.click(screen.getByRole("tab", { name: /^Lezárt/ }));
		expect(nav.replace).toHaveBeenCalledWith("/events?tab=closed", {
			scroll: false,
		});
	});

	it("sorts by a column header", async () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /Program/ }));
		expect(nav.replace).toHaveBeenCalledWith("/events?sort=name", {
			scroll: false,
		});
	});

	it("shows an empty state with a clear button when filtering", async () => {
		nav.search = "q=nincs";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		expect(
			screen.getByText("Nincs a szűrésnek megfelelő program"),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getAllByRole("button", { name: "Szűrők törlése" })[0],
		);
		expect(nav.replace).toHaveBeenCalledWith("/events", { scroll: false });
	});

	it("keeps the selected tab when clearing all filters", async () => {
		nav.search = "tab=closed&q=python&year=2025&page=2";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		await userEvent.click(
			screen.getAllByRole("button", { name: "Szűrők törlése" })[0],
		);
		expect(nav.replace).toHaveBeenCalledWith("/events?tab=closed", {
			scroll: false,
		});
	});

	it("shows the partner under the location", () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const row = screen.getAllByRole("row")[1];
		const location = within(row).getByText("Budapest");
		expect(location.nextElementSibling).toHaveTextContent(
			"Sigma Technology",
		);
	});

	it("renders placeholders for missing location, people and capacity", () => {
		render(
			<EventsView
				items={[
					event({
						location: null,
						companyName: null,
						instructor: null,
						mentors: [],
						capacity: 0,
						applicationCounts: { total: 7 },
					}),
				]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const cells = within(screen.getAllByRole("row")[1]).getAllByRole(
			"cell",
		);
		// Helyszín, Kapacitás · jelentkezők, Oktatók
		expect(cells[2]).toHaveTextContent(/^—$/);
		expect(cells[3]).toHaveTextContent(/^7 jelentkező$/);
		expect(within(cells[3]).queryByText(/×$/)).not.toBeInTheDocument();
		expect(cells[4]).toHaveTextContent(/^—$/);
	});

	it("shows the phase empty state without a clear button when unfiltered", () => {
		nav.search = "tab=planned";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		expect(
			screen.getByText("Ebben a szakaszban nincs program"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Szűrők törlése" }),
		).not.toBeInTheDocument();
	});

	it("labels the pager by tab", () => {
		const { unmount } = render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		expect(screen.getByText(/1–1 \/ 1 aktív program/)).toBeInTheDocument();
		unmount();

		nav.search = "tab=all";
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		expect(screen.getByText(/1–1 \/ 1 program$/)).toBeInTheDocument();
	});
});
