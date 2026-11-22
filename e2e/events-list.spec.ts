import { expect, test, type Page } from "@playwright/test";
import { EVENTS, eventNames } from "./support/fixtures";
import {
	expectColumnHeaders,
	expectScrollsInsideFrame,
	PHONE,
	pagerRange,
	rowNames,
	sortButton,
	TABLET,
} from "./support/table";

/**
 * A Programok lista jelenlegi viselkedése (event-list spec), a tábla
 * átírása előtti állapot rögzítése.
 */

const DEFAULT_HEADERS = [
	"Program",
	"Időpont",
	"Helyszín",
	"Cég",
	"Jelentkezők · kapacitás",
	"Oktatók",
	"Státusz",
	"Műveletek",
];

const table = (page: Page) => page.getByRole("table", { name: "Programok" });

const idOf = (name: string) => EVENTS.find((e) => e.name === name)!.id;

test.describe("desktop", () => {
	test("shows the default columns, latest start first", async ({ page }) => {
		await page.goto("/events");

		await expectColumnHeaders(table(page), DEFAULT_HEADERS);
		await expect(rowNames(table(page))).toHaveText(eventNames("from-desc"));
		await expect(pagerRange(page, "1–12 / 12 program")).toBeVisible();
		await expect(
			page
				.getByRole("navigation", { name: "Programok szakasz szerint" })
				.getByRole("link", { name: /Összes/ }),
		).toHaveAttribute("aria-current", "page");
	});

	test("sorts by name, then reverses on the second click", async ({
		page,
	}) => {
		await page.goto("/events");
		const header = table(page).getByRole("columnheader", {
			name: "Program",
		});

		await sortButton(table(page), "Program").click();
		await expect(page).toHaveURL(/[?&]sort=name$/);
		await expect(header).toHaveAttribute("aria-sort", "ascending");
		await expect(rowNames(table(page))).toHaveText(eventNames("name-asc"));

		await sortButton(table(page), "Program").click();
		await expect(page).toHaveURL(/[?&]sort=name&order=desc/);
		await expect(header).toHaveAttribute("aria-sort", "descending");
		await expect(rowNames(table(page))).toHaveText(eventNames("name-desc"));
	});

	test("sorts by capacity, smallest first", async ({ page }) => {
		await page.goto("/events");

		await sortButton(table(page), "Jelentkezők · kapacitás").click();
		await expect(page).toHaveURL(/[?&]sort=capacity$/);
		await expect(rowNames(table(page))).toHaveText(
			eventNames("capacity-asc"),
		);
	});

	test("pages and changes the page size", async ({ page }) => {
		await page.goto("/events");

		await page.getByLabel("Sorok / oldal").selectOption("10");
		await expect(page).toHaveURL(/[?&]pageSize=10/);
		await expect(pagerRange(page, "1–10 / 12 program")).toBeVisible();

		await page.getByRole("button", { name: "Következő oldal" }).click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(pagerRange(page, "11–12 / 12 program")).toBeVisible();
		await expect(rowNames(table(page))).toHaveText(
			eventNames("from-desc").slice(10),
		);
	});

	test("restores the view from the URL and ignores invalid values", async ({
		page,
	}) => {
		await page.goto("/events?sort=name&order=desc&page=2&pageSize=10");
		await expect(
			table(page).getByRole("columnheader", { name: "Program" }),
		).toHaveAttribute("aria-sort", "descending");
		await expect(rowNames(table(page))).toHaveText(
			eventNames("name-desc").slice(10),
		);

		await page.goto("/events?tab=draft&page=-1&sort=bogus");
		await expect(rowNames(table(page))).toHaveText(eventNames("from-desc"));
		await expect(pagerRange(page, "1–12 / 12 program")).toBeVisible();
	});

	test("clicking a row opens the program", async ({ page }) => {
		await page.goto("/events");
		const name = eventNames("from-desc")[0];

		// "Helyszín": a cell without links.
		await table(page)
			.getByRole("row", { name: new RegExp(name) })
			.getByRole("cell")
			.nth(2)
			.click();
		await expect(page).toHaveURL(`/events/${idOf(name)}`);
	});

	test("the row actions menu does not open the program", async ({ page }) => {
		await page.goto("/events");
		const name = eventNames("from-desc")[0];

		await table(page)
			.getByRole("button", { name: `Műveletek: ${name}` })
			.click();
		await expect(
			page.getByRole("menuitem", { name: "Program szerkesztése" }),
		).toBeVisible();
		await expect(page).toHaveURL("/events");
	});

	test("column picker hides a column, separately from Jelentkezők", async ({
		page,
	}) => {
		await page.goto("/events");
		await page.getByRole("button", { name: "Oszlopok" }).click();
		const panel = page.getByRole("dialog", { name: "Oszlopok a listában" });

		await panel
			.getByRole("checkbox", { name: "Oktatók, mentorok" })
			.click();
		const up = panel.getByRole("button", { name: "Státusz feljebb" });
		await up.click(); // above the hidden "Oktatók"
		await up.click(); // above "Jelentkezők · kapacitás"
		const changed = [
			"Program",
			"Időpont",
			"Helyszín",
			"Cég",
			"Státusz",
			"Jelentkezők · kapacitás",
			"Műveletek",
		];
		await expectColumnHeaders(table(page), changed);

		await page.reload();
		await expectColumnHeaders(table(page), changed);

		await page.goto("/applicants");
		await expect(
			page
				.getByRole("table", { name: "Jelentkezők" })
				.getByRole("columnheader"),
		).toHaveCount(7);
	});
});

test.describe("tablet", () => {
	test.use({ viewport: TABLET });

	test("the table scrolls inside its frame, not the page", async ({
		page,
	}) => {
		await page.goto("/events");
		await expectColumnHeaders(table(page), DEFAULT_HEADERS);
		await expectScrollsInsideFrame(
			page,
			page.getByTestId("events-table-frame"),
		);
	});
});

test.describe("phone", () => {
	test.use({ viewport: PHONE, hasTouch: true });

	const cards = (page: Page) =>
		page.getByRole("list", { name: "Programok" }).getByRole("listitem");

	test("shows cards instead of the table", async ({ page }) => {
		await page.goto("/events");

		await expect(page.getByTestId("events-table-frame")).toBeHidden();
		await expect(cards(page)).toHaveCount(12);
		await expect(cards(page).first()).toContainText(
			eventNames("from-desc")[0],
		);
	});

	test("tapping a card opens the program, its menu does not", async ({
		page,
	}) => {
		await page.goto("/events");
		const name = eventNames("from-desc")[0];

		await cards(page)
			.first()
			.getByRole("button", { name: `Műveletek: ${name}` })
			.tap();
		await expect(
			page.getByRole("menuitem", { name: "Program szerkesztése" }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page).toHaveURL("/events");

		await cards(page).first().locator("dl").tap();
		await expect(page).toHaveURL(`/events/${idOf(name)}`);
	});

	test("the compact column picker has no reorder controls", async ({
		page,
	}) => {
		await page.goto("/events");
		await page.getByRole("button", { name: "Oszlopok" }).click();
		const panel = page.getByRole("dialog", { name: "Oszlopok a listában" });

		await expect(panel.getByRole("checkbox")).toHaveCount(7);
		await expect(
			panel.getByRole("button", { name: /feljebb$/ }),
		).toHaveCount(0);
	});
});
