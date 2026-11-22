import type { Page } from "@playwright/test";
import { expect, test } from "../support/test";

/**
 * Duplikátumok ellenőrzése és összevonása (applicant-duplicates spec),
 * valódi adatbázison: a jelentkezések átkerülnek, a History a megtartott
 * jelentkezőhöz költözik, az összevont jelentkező törlődik.
 */

/**
 * Megnyitja az ellenőrző ablakot, és a „Kihagyás most” gombbal a teszt
 * saját párjáig lép (a párok sorrendje globális; más tesztek párjai is
 * lehetnek előtte).
 */
async function openPair(page: Page, token: string) {
	await page.goto("/applicants");
	await page.getByRole("button", { name: "Ellenőrzés" }).click();
	const dialog = page.getByRole("dialog");
	const merge = dialog.getByRole("radio", {
		name: /^Duplikáció – összevonás/,
	});
	for (let i = 0; i < 50; i++) {
		await expect(merge).toBeVisible();
		if ((await dialog.textContent())?.includes(token)) return dialog;
		await dialog.getByRole("button", { name: "Kihagyás most" }).click();
	}
	throw new Error(`Pair ${token} not found in the review dialog`);
}

test("merging moves every application and the history to the kept applicant", async ({
	page,
	factory,
	db,
}) => {
	const [kept, merged] = await factory.duplicatePair();
	const [python, robotika, tabor] = [
		await factory.event({ name: `Python ${factory.token}` }),
		await factory.event({ name: `Robotika ${factory.token}` }),
		await factory.event({ name: `Tabor ${factory.token}` }),
	];
	await factory.application({
		applicant: kept,
		event: python,
		status: "ACCEPTED",
	});
	await factory.application({
		applicant: merged,
		event: robotika,
		status: "ATTENDED",
	});
	await factory.application({ applicant: merged, event: tabor });
	const emailEdit = await factory.history({
		tableName: "applicant",
		recordId: merged.id,
		fieldName: "email",
		oldValue: "regi@example.com",
		newValue: merged.email,
	});

	const dialog = await openPair(page, factory.token);
	await dialog
		.getByRole("radio", { name: /^Duplikáció – összevonás/ })
		.check();
	await expect(
		dialog.getByRole("note", { name: "Mi történik összevonáskor?" }),
	).toContainText("Semmi sem cserélődik le.");
	const after = dialog.getByText("Összevonás után:").locator("..");
	for (const event of [python, robotika, tabor]) {
		await expect(after).toContainText(event.name);
	}

	await dialog.getByRole("radio", { name: "A adatlap megtartása" }).check();
	await dialog
		.getByRole("button", { name: "Döntés mentése és következő" })
		.click();
	await expect
		.poll(() => db.applicant.findUnique({ where: { id: merged.id } }))
		.toBeNull();
	await page.keyboard.press("Escape");

	// One applicant left, with all three applications.
	await page.goto(`/applicants?q=${factory.token}`);
	await expect(
		page.getByRole("table", { name: "Jelentkezők" }).locator("tbody > tr"),
	).toHaveCount(1);
	expect((await page.goto(`/applicants/${merged.id}`))?.status()).toBe(404);
	await page.goto(`/applicants/${kept.id}`);
	for (const [event, status] of [
		[python, "Elfogadva"],
		[robotika, "Részt vett"],
		[tabor, "Új jelentkező"],
	] as const) {
		await expect(
			page.getByRole("row", { name: new RegExp(event.name) }),
		).toContainText(status);
	}
	expect(
		await db.application.count({ where: { applicantId: kept.id } }),
	).toBe(3);

	// History moved to the kept applicant, nothing points to the merged one.
	expect(await db.history.count({ where: { recordId: merged.id } })).toBe(0);
	expect(
		await db.history.findUniqueOrThrow({ where: { id: emailEdit.id } }),
	).toMatchObject({ recordId: kept.id });
	await page.goto(`/history/${kept.id}`);
	await expect(page.getByText("Összevonva (duplikáció)")).toBeVisible();

	// The last pair of the key is merged: no longer flagged.
	expect(
		await db.applicant.findUniqueOrThrow({ where: { id: kept.id } }),
	).toMatchObject({ duplicateFlag: false });
});

test("a pair marked as not a duplicate is not offered again", async ({
	page,
	factory,
	db,
	request,
}) => {
	const [first, second] = await factory.duplicatePair();

	const dialog = await openPair(page, factory.token);
	await dialog
		.getByRole("radio", {
			name: /^Nem duplikáció – mindkét jelentkező megmarad/,
		})
		.check();
	await expect(
		dialog.getByRole("note", { name: "Mi történik összevonáskor?" }),
	).toBeHidden();
	await dialog
		.getByRole("button", { name: "Döntés mentése és következő" })
		.click();
	await expect
		.poll(() =>
			db.duplicateDismissal.count({
				where: {
					applicantAId: { in: [first.id, second.id] },
					applicantBId: { in: [first.id, second.id] },
				},
			}),
		)
		.toBe(1);

	// Both stay, still flagged; the decision is in the change log.
	const both = await db.applicant.findMany({
		where: { id: { in: [first.id, second.id] } },
	});
	expect(both.map((a) => a.duplicateFlag)).toEqual([true, true]);
	expect(
		await db.history.count({
			where: {
				fieldName: "duplicate_dismissed",
				recordId: { in: [first.id, second.id] },
			},
		}),
	).toBeGreaterThan(0);

	// None of the undecided pairs is this one.
	const firstPage = await (
		await request.get("/api/applicants/duplicates?skip=0")
	).json();
	for (let skip = 0; skip < firstPage.total; skip++) {
		const { pair } = await (
			await request.get(`/api/applicants/duplicates?skip=${skip}`)
		).json();
		expect([pair?.a.id, pair?.b.id]).not.toContain(first.id);
	}
});

test("merge refuses different people and deleted applicants", async ({
	factory,
	db,
	request,
}) => {
	const a = await factory.applicant();
	const b = await factory.applicant();
	const event = await factory.event();
	const application = await factory.application({ applicant: b, event });

	const different = await request.post("/api/applicants/merge", {
		data: { primaryId: a.id, mergeIds: [b.id] },
	});
	expect(different.status()).toBe(409);
	expect(
		await db.application.findUniqueOrThrow({
			where: { id: application.id },
		}),
	).toMatchObject({ applicantId: b.id });

	const [kept, deleted] = await factory.duplicatePair();
	expect(
		(
			await request.post("/api/applicants/delete", {
				data: { ids: [deleted.id] },
			})
		).status(),
	).toBe(200);
	const withDeleted = await request.post("/api/applicants/merge", {
		data: { primaryId: kept.id, mergeIds: [deleted.id] },
	});
	expect(withDeleted.status()).toBe(404);
});
