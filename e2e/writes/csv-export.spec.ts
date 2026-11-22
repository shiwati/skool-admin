import type { Page } from "@playwright/test";
import { exportCsv } from "../support/csv";
import { expect, test } from "../support/test";

/**
 * CSV export saját adattal (applicant-list spec): a képletként futtatható
 * cellák semlegesítése, és az export minden oldalt tartalmaz.
 */

async function showPhoneColumn(page: Page) {
	await page.getByRole("button", { name: "Oszlopok" }).click();
	await page
		.getByRole("dialog", { name: "Oszlopok a listában" })
		.getByRole("checkbox", { name: "Telefonszám" })
		.click();
	await page.keyboard.press("Escape");
}

test("cells that would run as a formula are neutralized, phone numbers are not", async ({
	page,
	factory,
}) => {
	await factory.applicant({
		lastName: "=HYPERLINK(1)",
		firstName: factory.token,
		phoneNumber: "+36 30 123 4567",
	});

	await page.goto(`/applicants?q=${factory.token}`);
	await showPhoneColumn(page);
	const csv = await exportCsv(page);

	expect(csv.rows).toHaveLength(1);
	const cell = (header: string) => csv.rows[0][csv.header.indexOf(header)];
	expect(cell("Vezetéknév")).toBe("'=HYPERLINK(1)");
	expect(cell("Telefonszám")).toBe("+36 30 123 4567");
});

test("the export spans every page, beyond the 100-row API page", async ({
	page,
	factory,
}) => {
	await factory.applicants(105);

	await page.goto(`/applicants?q=${factory.token}`);
	await expect(page.getByText("1–25 / 105 jelentkező")).toBeVisible();
	const csv = await exportCsv(page);

	expect(csv.rows).toHaveLength(105);
	expect(new Set(csv.rows.map((row) => row[0])).size).toBe(105);
	await expect(page.getByText("105 sor exportálva")).toBeVisible();
});
