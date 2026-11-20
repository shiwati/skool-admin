import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COLUMN_SETTINGS_KEY } from "@/lib/applicants/column-settings";
import { EVENT_COLUMN_CONFIG } from "@/lib/events/column-settings";
import { eventTableMinWidth } from "./event-columns";
import type { EventListItem } from "./events-table";
import { EventsView } from "./events-view";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
	usePathname: () => "/events",
	useSearchParams: () => new URLSearchParams(),
}));

const now = "2026-11-19T12:00:00.000Z";

const item: EventListItem = {
	id: "e1",
	name: "Python alapok – ősz",
	from: "2026-11-21T09:00:00.000Z",
	to: "2026-12-12T15:00:00.000Z",
	companyName: "Sigma Technology",
	location: "Budapest",
	applicationSheetUrl: null,
	instructor: "Kiss Bence",
	mentors: [],
	tags: ["programozás"],
	capacity: 20,
	applicationCounts: { total: 62 },
};

function renderView() {
	render(
		<EventsView
			items={[item]}
			total={1}
			counts={{ planned: 1, closed: 0, all: 1 }}
			now={now}
		/>,
	);
}

const tableHeaders = () =>
	within(screen.getByRole("table"))
		.getAllByRole("columnheader")
		.map((th) => th.textContent);

const cardLabels = () =>
	within(screen.getByRole("list", { name: "Programok" }))
		.getAllByRole("term")
		.map((dt) => dt.textContent);

async function openPicker(testId: string) {
	await userEvent.click(
		within(screen.getByTestId(testId)).getByRole("button", {
			name: "Oszlopok",
		}),
	);
	return screen.findByRole("dialog", { name: "Oszlopok a listában" });
}

describe("Programok column settings", () => {
	afterEach(() => window.localStorage.clear());

	it("shows every column by default, in the table and on the cards", () => {
		renderView();
		expect(tableHeaders()).toEqual([
			"Program",
			"Időpont",
			"Helyszín",
			"Kapacitás · jelentkezők",
			"Oktatók",
			"Státusz",
			"Műveletek",
		]);
		expect(cardLabels()).toEqual([
			"Időpont",
			"Helyszín",
			"Igény",
			"Oktatók",
			"Státusz",
		]);
	});

	it("hides a column in the table and its card line, and remembers it", async () => {
		renderView();
		const panel = await openPicker("events-trailing");
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Helyszín / partner" }),
		);
		expect(tableHeaders()).not.toContain("Helyszín");
		expect(cardLabels()).not.toContain("Helyszín");
		expect(screen.getByRole("table")).toHaveStyle({
			minWidth: `${eventTableMinWidth(["name", "date", "demand", "people", "status"])}px`,
		});

		const stored = JSON.parse(
			window.localStorage.getItem(EVENT_COLUMN_CONFIG.storageKey) ?? "",
		);
		expect(stored.hidden).toEqual(["location"]);
		// Separate from the Jelentkezők list settings.
		expect(window.localStorage.getItem(COLUMN_SETTINGS_KEY)).toBeNull();
	});

	it("only toggles visibility from the mobile icon button", async () => {
		renderView();
		const panel = await openPicker("events-mobile-trailing");
		expect(
			within(panel).getByRole("checkbox", {
				name: "Program (név, címkék)",
			}),
		).toBeDisabled();
		expect(
			within(panel).queryByRole("button", { name: /feljebb|lejjebb/ }),
		).not.toBeInTheDocument();
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Oktatók, mentorok" }),
		);
		expect(cardLabels()).not.toContain("Oktatók");
	});

	it("reorders from the tablet+ picker; the cards follow", async () => {
		renderView();
		const panel = await openPicker("events-trailing");
		await userEvent.click(
			within(panel).getByRole("button", { name: "Státusz feljebb" }),
		);
		expect(cardLabels()).toEqual([
			"Időpont",
			"Helyszín",
			"Igény",
			"Státusz",
			"Oktatók",
		]);
		expect(tableHeaders().slice(4, 6)).toEqual(["Státusz", "Oktatók"]);

		await userEvent.click(
			within(panel).getByRole("button", {
				name: "Alapértelmezés visszaállítása",
			}),
		);
		expect(tableHeaders()[4]).toBe("Oktatók");
	});

	it("restores saved settings", () => {
		window.localStorage.setItem(
			EVENT_COLUMN_CONFIG.storageKey,
			JSON.stringify({
				order: ["status", "name", "unknown"],
				hidden: ["name", "people"],
			}),
		);
		renderView();
		expect(tableHeaders()).toEqual([
			"Státusz",
			"Program",
			"Időpont",
			"Helyszín",
			"Kapacitás · jelentkezők",
			"Műveletek",
		]);
	});
});
