import { expect, test, type Page } from "@playwright/test";
import {
	APPLICANTS,
	applicantNames,
	fullName,
	YOUNGEST_INDEX,
} from "./support/fixtures";
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
 * A Jelentkezők lista jelenlegi viselkedése (applicant-list spec), a tábla
 * átírása előtti állapot rögzítése.
 */

const DEFAULT_HEADERS = [
	"Név / e-mail",
	"Életkor",
	"Program",
	"Státusz",
	"Település / iskola",
	"Hírlevél",
	"Előzmény",
];

const table = (page: Page) => page.getByRole("table", { name: "Jelentkezők" });

const idOf = (name: string) => APPLICANTS.find((a) => fullName(a) === name)!.id;

test.describe("desktop", () => {
	test("shows the default columns, newest applicants first", async ({
		page,
	}) => {
		await page.goto("/applicants");

		await expectColumnHeaders(table(page), DEFAULT_HEADERS);
		await expect(rowNames(table(page))).toHaveText(
			applicantNames("createdAt-desc").slice(0, 25),
		);
		await expect(pagerRange(page, "1–25 / 30 jelentkező")).toBeVisible();
	});

	test("sorts by name, then reverses on the second click", async ({
		page,
	}) => {
		await page.goto("/applicants");
		const header = table(page).getByRole("columnheader", {
			name: "Név / e-mail",
		});

		await sortButton(table(page), "Név / e-mail").click();
		await expect(page).toHaveURL(/[?&]sort=name&order=asc/);
		await expect(header).toHaveAttribute("aria-sort", "ascending");
		await expect(rowNames(table(page))).toHaveText(
			applicantNames("name-asc").slice(0, 25),
		);

		await sortButton(table(page), "Név / e-mail").click();
		await expect(page).toHaveURL(/[?&]sort=name&order=desc/);
		await expect(header).toHaveAttribute("aria-sort", "descending");
		await expect(rowNames(table(page))).toHaveText(
			applicantNames("name-desc").slice(0, 25),
		);
	});

	test("sorting by age puts the youngest first", async ({ page }) => {
		await page.goto("/applicants");

		await sortButton(table(page), "Életkor").click();
		await expect(page).toHaveURL(/[?&]sort=age&order=asc/);
		await expect(rowNames(table(page)).first()).toHaveText(
			fullName(APPLICANTS[YOUNGEST_INDEX]),
		);
	});

	test("pages and changes the page size", async ({ page }) => {
		await page.goto("/applicants");

		await page.getByRole("button", { name: "Következő oldal" }).click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(pagerRange(page, "26–30 / 30 jelentkező")).toBeVisible();
		await expect(rowNames(table(page))).toHaveText(
			applicantNames("createdAt-desc").slice(25),
		);

		await page.getByLabel("Sorok / oldal").selectOption("10");
		await expect(page).toHaveURL(/[?&]pageSize=10/);
		await expect(page).not.toHaveURL(/[?&]page=/);
		await expect(pagerRange(page, "1–10 / 30 jelentkező")).toBeVisible();
		await expect(rowNames(table(page))).toHaveCount(10);
	});

	test("restores sort, page and page size from the URL", async ({ page }) => {
		await page.goto("/applicants?sort=name&order=desc&page=2&pageSize=10");

		await expect(
			table(page).getByRole("columnheader", { name: "Név / e-mail" }),
		).toHaveAttribute("aria-sort", "descending");
		await expect(rowNames(table(page))).toHaveText(
			applicantNames("name-desc").slice(10, 20),
		);
		await expect(pagerRange(page, "11–20 / 30 jelentkező")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "2. oldal" }),
		).toHaveAttribute("aria-current", "page");
	});

	test("Szűrők törlése removes every active filter", async ({ page }) => {
		await page.goto(`/applicants?eventIds=e2e-event-01&newsletter=true`);
		await expect(pagerRange(page, "1–4 / 4 jelentkező")).toBeVisible();

		await page.getByRole("button", { name: "Szűrők törlése" }).click();
		await expect(page).toHaveURL("/applicants");
		await expect(pagerRange(page, "1–25 / 30 jelentkező")).toBeVisible();
	});

	test("clicking a row opens the applicant", async ({ page }) => {
		await page.goto("/applicants");
		const name = applicantNames("createdAt-desc")[0];

		// A non-link cell: the whole row navigates.
		await table(page)
			.getByRole("row", { name: new RegExp(name) })
			.getByRole("cell")
			.nth(4)
			.click();
		await expect(page).toHaveURL(`/applicants/${idOf(name)}`);
	});

	test("the name is a link to the applicant", async ({ page }) => {
		await page.goto("/applicants");
		const name = applicantNames("createdAt-desc")[1];

		await table(page).getByRole("link", { name }).click();
		await expect(page).toHaveURL(`/applicants/${idOf(name)}`);
	});

	test("column picker hides, reorders and remembers columns", async ({
		page,
	}) => {
		await page.goto("/applicants");
		await page.getByRole("button", { name: "Oszlopok" }).click();
		const panel = page.getByRole("dialog", { name: "Oszlopok a listában" });

		await panel.getByRole("checkbox", { name: "Hírlevél" }).click();
		const up = panel.getByRole("button", {
			name: "Előzmény (elvégzett programok) feljebb",
		});
		await up.click(); // above the hidden "Hírlevél"
		await up.click(); // above "Település / iskola"
		await panel
			.getByRole("checkbox", { name: "Jelentkezés dátuma" })
			.click();
		await expect(
			panel.getByRole("checkbox", { name: "Név / e-mail" }),
		).toBeDisabled();

		const changed = [
			"Név / e-mail",
			"Életkor",
			"Program",
			"Státusz",
			"Előzmény",
			"Település / iskola",
			"Jelentkezett",
		];
		await expectColumnHeaders(table(page), changed);

		await page.reload();
		await expectColumnHeaders(table(page), changed);

		await page.getByRole("button", { name: "Oszlopok" }).click();
		await panel
			.getByRole("button", { name: "Alapértelmezés visszaállítása" })
			.click();
		await expectColumnHeaders(table(page), DEFAULT_HEADERS);
	});
});

test.describe("tablet", () => {
	test.use({ viewport: TABLET });

	test("the table scrolls inside its frame, not the page", async ({
		page,
	}) => {
		await page.goto("/applicants");
		await expectColumnHeaders(table(page), DEFAULT_HEADERS);
		await expectScrollsInsideFrame(page, page.getByTestId("table-frame"));
	});
});

test.describe("phone", () => {
	test.use({ viewport: PHONE, hasTouch: true });

	const cards = (page: Page) =>
		page.getByRole("list", { name: "Jelentkezők" }).getByRole("listitem");

	test("shows cards instead of the table", async ({ page }) => {
		await page.goto("/applicants");

		await expect(page.getByTestId("table-frame")).toBeHidden();
		await expect(cards(page)).toHaveCount(25);
		const first = applicantNames("createdAt-desc")[0];
		await expect(cards(page).first()).toContainText(first);
		await expect(cards(page).first().locator("dt")).toHaveText(
			DEFAULT_HEADERS.slice(1),
		);
		await expect(page.getByRole("checkbox")).toHaveCount(0);
		await expect(pagerRange(page, "1–25 / 30 jelentkező")).toBeVisible();
	});

	test("the compact column picker only toggles card lines", async ({
		page,
	}) => {
		await page.goto("/applicants");
		await page.getByRole("button", { name: "Oszlopok" }).click();
		const panel = page.getByRole("dialog", { name: "Oszlopok a listában" });

		await expect(
			panel.getByRole("button", { name: /feljebb$/ }),
		).toHaveCount(0);
		await panel.getByRole("checkbox", { name: "Hírlevél" }).click();
		await page.keyboard.press("Escape");

		await expect(cards(page).first().locator("dt")).toHaveText(
			DEFAULT_HEADERS.slice(1).filter((label) => label !== "Hírlevél"),
		);
	});

	test("tapping a card opens the applicant", async ({ page }) => {
		await page.goto("/applicants");
		const name = applicantNames("createdAt-desc")[0];

		await cards(page).first().getByRole("link").tap();
		await expect(page).toHaveURL(`/applicants/${idOf(name)}`);
	});
});
