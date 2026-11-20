import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventListItem } from "./events-table";
import { EventsView } from "./events-view";

const nav = vi.hoisted(() => ({
	replace: vi.fn(),
	push: vi.fn(),
	search: "",
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: nav.replace, push: nav.push }),
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
		applicationSheetUrl: "https://docs.google.com/spreadsheets/d/x",
		instructor: "Kiss Bence",
		mentors: ["Szabó Petra", "Tóth Anna"],
		tags: ["programozás"],
		capacity: 20,
		applicationCounts: { total: 62 },
		...overrides,
	};
}

const counts = { planned: 6, closed: 9, all: 15 };

describe("EventsView", () => {
	beforeEach(() => {
		nav.search = "";
		nav.replace.mockReset();
		nav.push.mockReset();
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
			screen.getByRole("heading", { name: "Programok" }),
		).toBeInTheDocument();
		expect(screen.queryByText(/Találatok száma/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /^Összes\s*15$/ }),
		).toHaveAttribute("aria-current", "page");
		// Header button (md+) and the mobile floating button.
		const newLinks = screen.getAllByRole("link", { name: "Új program" });
		expect(newLinks).toHaveLength(2);
		for (const link of newLinks) {
			expect(link).toHaveAttribute("href", "/events/new");
		}

		const row = screen.getAllByRole("row")[1];
		expect(
			within(row).getByRole("link", { name: "Python alapok – ősz" }),
		).toHaveAttribute("href", "/events/e1");
		expect(within(row).getByText("2026.11.21 – 12.12")).toBeInTheDocument();
		expect(within(row).getByText("62 / 20 fő")).toBeInTheDocument();
		expect(within(row).getByText("3,1×")).toBeInTheDocument();
		expect(within(row).getByText("Betelt")).toBeInTheDocument();
		expect(within(row).getByText("+1")).toBeInTheDocument();
	});

	it("shows the result count only while a filter is active", () => {
		nav.search = "place=Budapest";
		render(
			<EventsView
				items={[event()]}
				total={7}
				counts={counts}
				now={now}
			/>,
		);
		expect(screen.getByText("Találatok száma: 7 db")).toBeInTheDocument();
	});

	it("switches tab through the URL and resets the page", async () => {
		nav.search = "page=2";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		await userEvent.click(screen.getByRole("link", { name: /^Múltbeli/ }));
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
		await userEvent.click(
			screen.getByRole("button", { name: /Program(?! éve)/ }),
		);
		expect(nav.replace).toHaveBeenCalledWith("/events?sort=name", {
			scroll: false,
		});
	});

	it("shows an empty state with a clear button when filtering", async () => {
		nav.search = "q=nincs";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		expect(
			within(screen.getByRole("table")).getByText(
				"Nincs a szűrésnek megfelelő program",
			),
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

	it("shows the company in its own column", () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const row = screen.getAllByRole("row")[1];
		expect(within(row).getByText("Sigma Technology")).toBeInTheDocument();
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
		// Helyszín, Cég, Jelentkezők · kapacitás, Oktatók
		expect(cells[2]).toHaveTextContent(/^—$/);
		expect(cells[3]).toHaveTextContent(/^—$/);
		expect(cells[4]).toHaveTextContent(/^7 jelentkező$/);
		expect(within(cells[4]).queryByText(/×$/)).not.toBeInTheDocument();
		expect(cells[5]).toHaveTextContent(/^—$/);
	});

	it("shows the phase empty state without a clear button when unfiltered", () => {
		nav.search = "tab=planned";
		render(<EventsView items={[]} total={0} counts={counts} now={now} />);
		expect(
			within(screen.getByRole("table")).getByText(
				"Ebben a szakaszban nincs program",
			),
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
		expect(screen.getByText(/1–1 \/ 1 program$/)).toBeInTheDocument();
		unmount();

		nav.search = "tab=planned";
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		expect(
			screen.getByText(/1–1 \/ 1 jövőbeli program/),
		).toBeInTheDocument();
	});
});

describe("EventsView on mobile (05.1 M)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nav.search = "";
	});

	it("shows program cards with demand and a name link (spec scenario)", () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const list = screen.getByRole("list", { name: "Programok" });
		expect(list).toHaveClass("md:hidden");
		const card = within(list).getByRole("listitem");
		expect(card).toHaveTextContent("62 / 20 fő");
		expect(card).toHaveTextContent("3,1×");
		expect(card).toHaveTextContent("Budapest");
		expect(card).toHaveTextContent("Sigma Technology");
		expect(
			within(card).getByRole("link", { name: "Python alapok – ősz" }),
		).toHaveAttribute("href", "/events/e1");
		expect(screen.getByTestId("events-table-frame")).toHaveClass(
			"hidden",
			"md:block",
		);
	});

	it("keeps the row actions on the card", async () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const card = within(
			screen.getByRole("list", { name: "Programok" }),
		).getByRole("listitem");
		await userEvent.click(
			within(card).getByRole("button", {
				name: "Műveletek: Python alapok – ősz",
			}),
		);
		expect(
			screen.getByRole("menuitem", { name: "Jelentkezők megtekintése" }),
		).toHaveAttribute("href", "/applicants?eventIds=e1");
	});

	it("offers a floating Új program button and scrollable tabs and chips", () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const fab = screen.getByTestId("new-event-fab");
		expect(fab).toHaveAttribute("href", "/events/new");
		expect(fab).toHaveClass("fixed", "md:hidden");
		expect(
			screen.getByRole("navigation", {
				name: "Programok szakasz szerint",
			}),
		).toHaveClass("overflow-x-auto");
		expect(screen.getByTestId("event-filter-chips")).toHaveClass(
			"overflow-x-auto",
			"md:contents",
		);
	});
	it("opens the program from anywhere on the row or the card", async () => {
		render(
			<EventsView
				items={[event()]}
				total={1}
				counts={counts}
				now={now}
			/>,
		);
		const row = screen.getAllByRole("row")[1];
		expect(row).toHaveClass("cursor-pointer");
		await userEvent.click(within(row).getByText("62 / 20 fő"));
		expect(nav.push).toHaveBeenCalledWith("/events/e1");

		// The actions menu keeps its own behaviour.
		nav.push.mockReset();
		await userEvent.click(
			within(row).getByRole("button", {
				name: "Műveletek: Python alapok – ősz",
			}),
		);
		expect(nav.push).not.toHaveBeenCalled();
		await userEvent.keyboard("{Escape}");

		const card = within(
			screen.getByRole("list", { name: "Programok" }),
		).getByText("Budapest");
		await userEvent.click(card);
		expect(nav.push).toHaveBeenCalledWith("/events/e1");
	});
});
