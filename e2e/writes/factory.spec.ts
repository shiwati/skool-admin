import { expect, test } from "../support/test";

/**
 * Az adatgyár önellenőrzése: amit létrehoz, az a valódi appban, a valódi
 * lekérdezéseken át látszik, és a tesztek nem látják egymás adatát.
 */

test("created applicants show up in the list, with their program", async ({
	page,
	factory,
}) => {
	const event = await factory.event();
	const applicant = await factory.applicant();
	await factory.application({ applicant, event, status: "ACCEPTED" });

	await page.goto(`/applicants?q=${factory.token}`);
	const rows = page
		.getByRole("table", { name: "Jelentkezők" })
		.locator("tbody > tr");
	await expect(rows).toHaveCount(1);
	await expect(rows.first()).toContainText(applicant.lastName);
	await expect(rows.first()).toContainText(event.name);
	await expect(rows.first()).toContainText("Elfogadva");
});

test("a duplicate pair is flagged like an imported one", async ({
	page,
	factory,
}) => {
	const [first, second] = await factory.duplicatePair();
	expect(first.duplicateFlag).toBe(true);
	expect(second.duplicateFlag).toBe(true);

	await page.goto(`/applicants?q=${factory.token}`);
	await expect(
		page.getByRole("table", { name: "Jelentkezők" }).locator("tbody > tr"),
	).toHaveCount(2);
});

test("each test only sees its own data", async ({ page, factory }) => {
	await page.goto(`/applicants?q=${factory.token}`);
	await expect(
		page
			.getByRole("table", { name: "Jelentkezők" })
			.getByText("Nincs a szűrésnek megfelelő jelentkező"),
	).toBeVisible();
});
