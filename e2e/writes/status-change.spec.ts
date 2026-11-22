import type { Page } from "@playwright/test";
import type { Applicant, ApplicationStatus, Event } from "@prisma/client";
import type { Factory } from "../support/factory";
import { expect, test } from "../support/test";

/**
 * Státuszváltás a program Jelentkezők fülén (event-overview spec), valódi
 * adatbázison: tömegesen és soronként, a kapacitás-figyelmeztetéssel, a
 * változásnaplóval és a frissülő darabszámokkal.
 */

/** Egy program `statuses.length` jelentkezéssel, a megadott státuszokkal. */
async function programWith(
	factory: Factory,
	statuses: ApplicationStatus[],
	capacity = 0,
) {
	const event = await factory.event({ capacity });
	const rows: { applicant: Applicant; id: string }[] = [];
	for (const status of statuses) {
		const applicant = await factory.applicant();
		const { id } = await factory.application({ applicant, event, status });
		rows.push({ applicant, id });
	}
	return { event, rows };
}

const nameOf = (a: { lastName: string; firstName: string }) =>
	`${a.lastName} ${a.firstName}`;

function tab(page: Page, event: Event) {
	return page.goto(`/events/${event.id}/applicants`);
}

const table = (page: Page) =>
	page.getByRole("table", { name: "Jelentkezések" });
const bar = (page: Page) =>
	page.getByRole("toolbar", { name: "Tömeges műveletek" });
const chip = (page: Page, label: string) =>
	page
		.getByRole("group", { name: "Szűrés státusz szerint" })
		.getByRole("button", { name: new RegExp(`^${label}`) });

test("bulk accept changes the selected applications and logs each one", async ({
	page,
	factory,
	db,
}) => {
	const { event, rows } = await programWith(factory, [
		"APPLIED",
		"APPLIED",
		"APPLIED",
	]);
	await tab(page, event);

	await table(page)
		.getByRole("checkbox", {
			name: "Az oldal összes jelentkezésének kijelölése",
		})
		.click();
	await expect(bar(page)).toContainText("3 kijelölve");
	await bar(page).getByRole("button", { name: "Elfogadva" }).click();

	await expect(
		page.getByText("3 jelentkezés státusza: Elfogadva"),
	).toBeVisible();
	await expect(bar(page)).toBeHidden();
	for (const { applicant } of rows) {
		await expect(
			table(page).getByRole("button", {
				name: `${nameOf(applicant)} státusza: Elfogadva. Módosítás`,
			}),
		).toBeVisible();
	}
	await expect(chip(page, "Elfogadva")).toContainText("3");

	const history = await db.history.findMany({
		where: {
			tableName: "application",
			fieldName: "status",
			recordId: { in: rows.map((r) => r.id) },
		},
	});
	expect(history).toHaveLength(3);
	for (const entry of history) {
		expect(entry).toMatchObject({
			oldValue: "APPLIED",
			newValue: "ACCEPTED",
			createdById: "e2e-admin",
		});
	}
});

test("applications already in the target status are skipped", async ({
	page,
	factory,
	db,
}) => {
	const { event, rows } = await programWith(factory, ["ACCEPTED", "APPLIED"]);
	await tab(page, event);

	await table(page)
		.getByRole("checkbox", {
			name: "Az oldal összes jelentkezésének kijelölése",
		})
		.click();
	await bar(page).getByRole("button", { name: "Elfogadva" }).click();

	await expect(
		page.getByText("1 jelentkezés státusza: Elfogadva"),
	).toBeVisible();
	const history = await db.history.findMany({
		where: { recordId: { in: rows.map((r) => r.id) }, fieldName: "status" },
	});
	expect(history.map((h) => h.recordId)).toEqual([rows[1].id]);
});

test("one row's status changes from its menu", async ({
	page,
	factory,
	db,
}) => {
	const { event, rows } = await programWith(factory, ["APPLIED", "APPLIED"]);
	const [target, other] = rows;
	await tab(page, event);

	await table(page)
		.getByRole("button", {
			name: `${nameOf(target.applicant)} státusza: Új jelentkező. Módosítás`,
		})
		.click();
	await page.getByRole("menuitem", { name: "Várólista" }).click();

	await expect(
		page.getByText("1 jelentkezés státusza: Várólista"),
	).toBeVisible();
	await expect(page).toHaveURL(`/events/${event.id}/applicants`);
	await expect(
		table(page).getByRole("button", {
			name: `${nameOf(target.applicant)} státusza: Várólista. Módosítás`,
		}),
	).toBeVisible();
	expect(
		await db.application.findUniqueOrThrow({ where: { id: other.id } }),
	).toMatchObject({ status: "APPLIED" });
});

test("accepting beyond the capacity asks first", async ({
	page,
	factory,
	db,
}) => {
	const { event, rows } = await programWith(
		factory,
		["ACCEPTED", "APPLIED", "APPLIED"],
		2,
	);
	const pending = rows.slice(1);
	await tab(page, event);

	const selectPending = async () => {
		for (const { applicant } of pending) {
			await table(page)
				.getByRole("checkbox", {
					name: `${nameOf(applicant)} kijelölése`,
				})
				.click();
		}
		await bar(page).getByRole("button", { name: "Elfogadva" }).click();
	};
	const statuses = () =>
		db.application
			.findMany({
				where: { id: { in: pending.map((r) => r.id) } },
				select: { status: true },
			})
			.then((list) => list.map((a) => a.status));

	await selectPending();
	const confirm = page.getByRole("alertdialog", {
		name: "Túlléped a kapacitást?",
	});
	await expect(confirm).toContainText(
		"A művelet után 3 elfogadott jelentkező lenne, a program kapacitása 2.",
	);
	await confirm.getByRole("button", { name: "Mégse" }).click();
	await expect(confirm).toBeHidden();
	expect(await statuses()).toEqual(["APPLIED", "APPLIED"]);

	// The selection is kept after Mégse: try again and confirm.
	await bar(page).getByRole("button", { name: "Elfogadva" }).click();
	await confirm.getByRole("button", { name: "Elfogadás mégis" }).click();
	await expect(
		page.getByText("2 jelentkezés státusza: Elfogadva"),
	).toBeVisible();
	expect(await statuses()).toEqual(["ACCEPTED", "ACCEPTED"]);
});
