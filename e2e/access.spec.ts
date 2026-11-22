import { expect, test, type Page } from "@playwright/test";
import { APPLICANTS, APPLICATIONS, OVERVIEW_EVENT } from "./support/fixtures";
import { AUTH_FILE } from "./support/paths";
import { adminPages, apiRoutes, fillParams } from "./support/routes";

/**
 * Hozzáférés (admin-auth, api-conventions spec): minden API route és admin
 * oldal védett. A route-ok a fájlrendszerből jönnek, így egy új, védelem
 * nélküli route vagy oldal automatikusan bukó tesztet ad.
 */

/** Nyilvános: a NextAuth végpontjai és a health check. */
const PUBLIC_API = [/^\/api\/auth\//, /^\/api\/health$/];

/** Nem létező id: ha egy route-ról hiányozna a védelem, se írjon valós adatba. */
const MISSING_ID = "e2e-missing";

const PAGE_IDS = {
	applicants: APPLICANTS[0].id,
	events: OVERVIEW_EVENT.id,
	history: APPLICANTS[0].id,
};

const NO_SESSION = { cookies: [], origins: [] };

/** A `/login` átirányítás és a visszatérési cím. */
async function expectLoginRedirect(page: Page, returnTo: string) {
	await expect(page).toHaveURL(/\/login\?/);
	const url = new URL(page.url());
	expect(url.pathname).toBe("/login");
	expect(url.searchParams.get("callbackUrl")).toBe(returnTo);
}

const routes = apiRoutes();
const protectedRoutes = routes.filter(
	(route) => !PUBLIC_API.some((re) => re.test(route.pattern)),
);

test.describe("without a session", () => {
	test.use({ storageState: NO_SESSION });

	test("finds the API routes and admin pages to check", () => {
		expect(protectedRoutes.map((r) => r.pattern)).toEqual(
			expect.arrayContaining([
				"/api/applicants",
				"/api/applicants/delete",
				"/api/events/[id]",
			]),
		);
		for (const route of protectedRoutes) {
			expect(route.methods, route.pattern).not.toHaveLength(0);
		}
		expect(adminPages()).toEqual(
			expect.arrayContaining(["/", "/applicants", "/events/[id]"]),
		);
	});

	for (const route of protectedRoutes) {
		for (const method of route.methods) {
			test(`${method} ${route.pattern} answers 401`, async ({
				request,
			}) => {
				const url = fillParams(route.pattern, {}, MISSING_ID);
				const res = await request.fetch(url, {
					method,
					data: method === "GET" ? undefined : {},
					maxRedirects: 0,
				});
				expect(res.status()).toBe(401);
				expect(await res.json()).toEqual({ error: "Unauthorized" });
			});
		}
	}

	test("the health check stays public", async ({ request }) => {
		const res = await request.get("/api/health", { maxRedirects: 0 });
		expect(res.status()).toBe(200);
	});

	for (const pattern of adminPages()) {
		test(`${pattern} redirects to the login page`, async ({ page }) => {
			const path = fillParams(pattern, PAGE_IDS, MISSING_ID);
			await page.goto(path);
			await expectLoginRedirect(page, path);
		});
	}

	test("the return URL keeps the query string", async ({ page }) => {
		await page.goto("/applicants?q=kiss&page=2");
		await expectLoginRedirect(page, "/applicants?q=kiss&page=2");
	});

	test("rejected writes change nothing", async ({ request, playwright }) => {
		const application = APPLICATIONS[0];
		const applicant = APPLICANTS[0];

		const status = await request.post(
			`/api/events/${OVERVIEW_EVENT.id}/applicants/status`,
			{ data: { ids: [application.id], status: "REJECTED" } },
		);
		expect(status.status()).toBe(401);
		const remove = await request.post("/api/applicants/delete", {
			data: { ids: [applicant.id] },
		});
		expect(remove.status()).toBe(401);

		// Check with an admin session that both are unchanged.
		const admin = await playwright.request.newContext({
			baseURL: test.info().project.use.baseURL,
			storageState: AUTH_FILE,
		});
		try {
			const applications = await admin.get(
				`/api/events/${OVERVIEW_EVENT.id}/applicants?pageSize=100`,
			);
			const { items } = (await applications.json()) as {
				items: { id: string; status: string }[];
			};
			expect(items.find((i) => i.id === application.id)?.status).toBe(
				application.status,
			);

			const applicants = await admin.get(
				`/api/applicants?q=${applicant.lastName}`,
			);
			expect((await applicants.json()).total).toBe(1);
		} finally {
			await admin.dispose();
		}
	});
});

test.describe("with a session", () => {
	test("opening the login page goes to the dashboard", async ({ page }) => {
		await page.goto("/login");
		await expect(page).toHaveURL("/");
	});

	test("an expired session sends the user to login with the current list URL", async ({
		page,
		context,
	}) => {
		await page.goto("/applicants");
		const table = page.getByRole("table", { name: "Jelentkezők" });
		await expect(table.locator("tbody tr")).toHaveCount(25);

		await context.clearCookies();
		await table
			.getByRole("columnheader", { name: "Név / e-mail" })
			.getByRole("button")
			.click();

		await expectLoginRedirect(page, "/applicants?sort=name&order=asc");
	});
});
