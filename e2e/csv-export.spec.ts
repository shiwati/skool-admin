import { expect, test } from "@playwright/test";
import { exportCsv, todayInBudapest } from "./support/csv";
import { APPLICANTS, applicantNames, eventNames } from "./support/fixtures";

/**
 * CSV export a közös adatokon (applicant-list és event-list spec): fájlnév,
 * formátum, oszlopok, szűrés, és az üres eredmény.
 */

const DEFAULT_APPLICANT_HEADER = [
	"Vezetéknév",
	"Keresztnév",
	"E-mail",
	"Életkor",
	"Program",
	"Státusz",
	"Település",
	"Iskola",
	"Hírlevél",
	"Elvégzett programok",
];

const lastNameOf = (fullName: string) =>
	APPLICANTS.find((a) => `${a.lastName} ${a.firstName}` === fullName)!
		.lastName;

test.describe("applicants", () => {
	test("exports every applicant in the list order, in the agreed format", async ({
		page,
	}) => {
		await page.goto("/applicants");
		const csv = await exportCsv(page);

		expect(csv.filename).toBe(`jelentkezok-${todayInBudapest()}.csv`);
		// UTF-8 BOM, semicolons, CRLF line breaks (Hungarian Excel).
		expect([...csv.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
		const text = csv.bytes.toString("utf8");
		expect(text.split("\r\n")).toHaveLength(32); // header + 30 + final break
		expect(text).not.toMatch(/[^\r]\n/);

		expect(csv.header).toEqual(DEFAULT_APPLICANT_HEADER);
		expect(csv.rows).toHaveLength(30);
		expect(csv.rows[0][0]).toBe(
			lastNameOf(applicantNames("createdAt-desc")[0]),
		);
		await expect(page.getByText("30 sor exportálva")).toBeVisible();
	});

	test("exports only the filtered applicants", async ({ page }) => {
		await page.goto("/applicants?eventIds=e2e-event-01&newsletter=true");
		const csv = await exportCsv(page);

		expect(csv.rows).toHaveLength(4);
		const newsletter = csv.header.indexOf("Hírlevél");
		expect(new Set(csv.rows.map((row) => row[newsletter]))).toEqual(
			new Set(["igen"]),
		);
	});

	test("the columns follow the column settings", async ({ page }) => {
		await page.goto("/applicants");
		await page.getByRole("button", { name: "Oszlopok" }).click();
		const panel = page.getByRole("dialog", { name: "Oszlopok a listában" });
		await panel.getByRole("checkbox", { name: /^Életkor/ }).click();
		await panel.getByRole("checkbox", { name: "Telefonszám" }).click();
		await page.keyboard.press("Escape");

		const csv = await exportCsv(page);
		expect(csv.header).not.toContain("Életkor");
		expect(csv.header.at(-1)).toBe("Telefonszám");
		expect(csv.rows[0].at(-1)).toMatch(/^\+36 30 000 00\d\d$/);
	});

	test("nothing to export downloads no file", async ({ page }) => {
		await page.goto("/applicants?q=senkisenemhivjaigy");
		let downloaded = false;
		page.on("download", () => (downloaded = true));

		await page.getByRole("button", { name: "Exportálás CSV-be" }).click();
		await expect(
			page.getByText("Nincs exportálható sor a szűrésnek megfelelően."),
		).toBeVisible();
		expect(downloaded).toBe(false);
	});
});

test.describe("programs", () => {
	test("exports every program with the fixed columns", async ({ page }) => {
		await page.goto("/events?pageSize=10");
		const csv = await exportCsv(page);

		expect(csv.filename).toBe(`programok-${todayInBudapest()}.csv`);
		expect(csv.header).toEqual([
			"Program",
			"Címkék",
			"Kezdés",
			"Befejezés",
			"Helyszín",
			"Partnercég",
			"Kapacitás",
			"Jelentkezők",
			"Oktatók",
			"Státusz",
		]);
		// Every page, not just the 10 rows on screen.
		expect(csv.rows.map((row) => row[0])).toEqual(eventNames("from-desc"));
		await expect(page.getByText("12 sor exportálva")).toBeVisible();
	});
});
