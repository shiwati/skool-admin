import { expect, type Locator, type Page } from "@playwright/test";

/** Telefon és tablet nézet (responsive-layout spec töréspontjai). */
export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 820, height: 1180 };

/** A fejléccellák akadálymentes nevei, sorrendben. */
export async function expectColumnHeaders(table: Locator, names: string[]) {
	const headers = table.getByRole("columnheader");
	await expect(headers).toHaveCount(names.length);
	for (const [index, name] of names.entries()) {
		await expect(headers.nth(index)).toHaveAccessibleName(name);
	}
}

/** A sorok első linkje (a név) — a sorok sorrendjének ellenőrzéséhez. */
export function rowNames(table: Locator): Locator {
	return table.locator("tbody > tr").getByRole("link");
}

/** Rendezhető fejléc gombja (a fejléc neve alapján). */
export function sortButton(table: Locator, header: string): Locator {
	return table
		.getByRole("columnheader", { name: header })
		.getByRole("button");
}

/** A lapozó „1–25 / 30 …” felirata. */
export function pagerRange(page: Page, text: string): Locator {
	return page.getByText(text, { exact: true });
}

/** A tábla kerete a saját tartalmán belül görget, az oldal nem. */
export async function expectScrollsInsideFrame(page: Page, frame: Locator) {
	const overflow = await frame.evaluate(
		(el) => el.scrollWidth - el.clientWidth,
	);
	expect(overflow).toBeGreaterThan(0);
	const pageOverflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(pageOverflow).toBeLessThanOrEqual(0);
}
