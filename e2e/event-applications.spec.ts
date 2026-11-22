import { expect, test, type Page } from "@playwright/test";
import {
	APPLICANTS,
	fullName,
	OVERVIEW_EVENT,
	overviewApplicantNames,
} from "./support/fixtures";
import {
	expectColumnHeaders,
	PHONE,
	pagerRange,
	rowNames,
	sortButton,
} from "./support/table";

/**
 * A program Jelentkezők fülének táblája (event-overview spec): rendezés,
 * lapozás, kijelölés. A tömeges státuszváltást nem futtatja (adatot írna).
 */

const PATH = `/events/${OVERVIEW_EVENT.id}/applicants`;
const SELECT_ALL = "Az oldal összes jelentkezésének kijelölése";

const table = (page: Page) =>
	page.getByRole("table", { name: "Jelentkezések" });

const idOf = (name: string) => APPLICANTS.find((a) => fullName(a) === name)!.id;

test.describe("desktop", () => {
	test("shows the columns, oldest application first", async ({ page }) => {
		await page.goto(PATH);

		await expectColumnHeaders(table(page), [
			SELECT_ALL,
			"Név",
			"Kor",
			"Település Iskola",
			"Hírlevél",
			"Státusz",
		]);
		await expect(rowNames(table(page))).toHaveText(
			overviewApplicantNames("receivedAt-asc"),
		);
		await expect(pagerRange(page, "1–12 / 12 jelentkezés")).toBeVisible();
	});

	test("sorts by name, then reverses on the second click", async ({
		page,
	}) => {
		await page.goto(PATH);
		const header = table(page).getByRole("columnheader", { name: "Név" });

		await sortButton(table(page), "Név").click();
		await expect(page).toHaveURL(/[?&]sort=name$/);
		await expect(header).toHaveAttribute("aria-sort", "ascending");
		await expect(rowNames(table(page))).toHaveText(
			overviewApplicantNames("name-asc"),
		);

		await sortButton(table(page), "Név").click();
		await expect(page).toHaveURL(/[?&]sort=name&order=desc/);
		await expect(header).toHaveAttribute("aria-sort", "descending");
		await expect(rowNames(table(page))).toHaveText(
			overviewApplicantNames("name-asc").reverse(),
		);
	});

	test("pages, and restores the view from the URL", async ({ page }) => {
		await page.goto(PATH);

		await page.getByLabel("Sorok / oldal").selectOption("10");
		await expect(page).toHaveURL(/[?&]pageSize=10/);
		await expect(pagerRange(page, "1–10 / 12 jelentkezés")).toBeVisible();
		await page.getByRole("button", { name: "Következő oldal" }).click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(pagerRange(page, "11–12 / 12 jelentkezés")).toBeVisible();

		await page.goto(`${PATH}?sort=name&order=desc&page=2&pageSize=10`);
		await expect(rowNames(table(page))).toHaveText(
			overviewApplicantNames("name-asc").reverse().slice(10),
		);
	});

	test("selects rows without leaving the page", async ({ page }) => {
		await page.goto(PATH);
		const [first, second] = overviewApplicantNames("receivedAt-asc");
		const selectAll = table(page).getByRole("checkbox", {
			name: SELECT_ALL,
		});
		const bar = page.getByLabel("Tömeges műveletek");

		await table(page)
			.getByRole("checkbox", { name: `${first} kijelölése` })
			.click();
		await expect(page).toHaveURL(PATH);
		await expect(
			table(page).getByRole("row", { name: new RegExp(first) }),
		).toHaveAttribute("aria-selected", "true");
		await expect(
			table(page).getByRole("row", { name: new RegExp(second) }),
		).toHaveAttribute("aria-selected", "false");
		await expect(selectAll).toHaveAttribute("aria-checked", "mixed");
		await expect(bar).toContainText("1 kijelölve");

		await selectAll.click();
		await expect(selectAll).toHaveAttribute("aria-checked", "true");
		await expect(bar).toContainText("12 kijelölve");

		await bar
			.getByRole("button", { name: "Kijelölés megszüntetése" })
			.click();
		await expect(selectAll).toHaveAttribute("aria-checked", "false");
		await expect(bar).toBeHidden();
	});

	test("the status menu does not open the applicant", async ({ page }) => {
		await page.goto(PATH);
		const name = overviewApplicantNames("receivedAt-asc")[0];

		await table(page)
			.getByRole("button", { name: new RegExp(`^${name} státusza:`) })
			.click();
		await expect(page.getByRole("menu")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page).toHaveURL(PATH);
	});

	test("clicking a row opens the applicant", async ({ page }) => {
		await page.goto(PATH);
		const name = overviewApplicantNames("receivedAt-asc")[0];

		// "Kor": a cell without controls.
		await table(page)
			.getByRole("row", { name: new RegExp(name) })
			.getByRole("cell")
			.nth(2)
			.click();
		await expect(page).toHaveURL(`/applicants/${idOf(name)}`);
	});
});

test.describe("phone", () => {
	test.use({ viewport: PHONE, hasTouch: true });

	test("keeps the table and hides the place and newsletter columns", async ({
		page,
	}) => {
		await page.goto(PATH);

		await expectColumnHeaders(table(page), [
			SELECT_ALL,
			"Név",
			"Kor",
			"Státusz",
		]);
		await expect(rowNames(table(page))).toHaveCount(12);
	});
});
