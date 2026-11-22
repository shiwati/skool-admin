import type { Page } from "@playwright/test";
import { expect, test } from "../support/test";

/**
 * GDPR-törlés az adatlapról (applicant-anonymization spec), valódi
 * adatbázison: a személyes adat eltűnik, a névtelen részvétel és a
 * statisztika megmarad, a változásnapló tisztul.
 */

/** Az adatlap „Profil törlése” gombja és a megerősítő ablak. */
async function openDeleteDialog(page: Page, applicantId: string) {
	await page.goto(`/applicants/${applicantId}`);
	await page.getByRole("button", { name: "Profil törlése" }).click();
	return page.getByRole("alertdialog");
}

const ACKNOWLEDGE = "Értem, a törlés nem vonható vissza";

test("deleting from the detail page anonymizes the applicant", async ({
	page,
	factory,
	db,
}) => {
	const event = await factory.event();
	const applicant = await factory.applicant({
		firstName: "Luca",
		phoneNumber: "+36 30 123 4567",
		schoolName: "Minta Gimnazium",
		parentFirstName: "Eva",
		parentLastName: "Szulo",
		parentEmail: "szulo@example.com",
		parentPhone: "+36 20 765 4321",
		parentAddress: "Budapest, Minta utca 1.",
		parentMothersName: "Anyja Neve",
		newsletter: true,
	});
	const application = await factory.application({
		applicant,
		event,
		status: "ACCEPTED",
		comment: "Szeretnek jonni",
		foodPreference: "vegetarianus",
	});
	const emailEdit = await factory.history({
		tableName: "applicant",
		recordId: applicant.id,
		fieldName: "email",
		oldValue: "regi@example.com",
		newValue: applicant.email,
	});
	const commentEdit = await factory.history({
		tableName: "application",
		recordId: application.id,
		fieldName: "comment",
		oldValue: null,
		newValue: "Szeretnek jonni",
	});

	const dialog = await openDeleteDialog(page, applicant.id);
	await expect(dialog).toContainText(
		`Törlöd ${applicant.lastName} Luca adatait?`,
	);
	const confirm = dialog.getByRole("button", { name: "Törlés" });
	await expect(confirm).toBeDisabled();
	await dialog.getByRole("checkbox", { name: ACKNOWLEDGE }).click();
	await confirm.click();

	await expect(page).toHaveURL("/applicants");
	await expect(page.getByText("1 jelentkező törölve")).toBeVisible();

	// Gone from the UI: not listed, detail page is 404.
	await page.goto(`/applicants?q=${factory.token}`);
	await expect(
		page
			.getByRole("table", { name: "Jelentkezők" })
			.getByText("Nincs a szűrésnek megfelelő jelentkező"),
	).toBeVisible();
	const detail = await page.goto(`/applicants/${applicant.id}`);
	expect(detail?.status()).toBe(404);

	// Personal data removed, non-identifying data kept, deletion recorded.
	const stored = await db.applicant.findUniqueOrThrow({
		where: { id: applicant.id },
	});
	expect(stored).toMatchObject({
		firstName: "Törölt",
		lastName: "jelentkező",
		email: null,
		phoneNumber: null,
		schoolName: null,
		parentFirstName: null,
		parentLastName: null,
		parentMothersName: null,
		parentAddress: null,
		parentEmail: null,
		parentPhone: null,
		newsletter: false,
		birthYear: applicant.birthYear,
		hometown: applicant.hometown,
		deletedById: "e2e-admin",
		duplicateKey: null,
		duplicateFlag: false,
	});
	expect(stored.deletedAt).not.toBeNull();

	// The application stays for the statistics, without free-text answers.
	const kept = await db.application.findUniqueOrThrow({
		where: { id: application.id },
	});
	expect(kept).toMatchObject({
		eventId: event.id,
		status: "ACCEPTED",
		comment: null,
		foodPreference: null,
	});
	expect(await db.application.count({ where: { eventId: event.id } })).toBe(
		1,
	);

	// Change log: old values scrubbed, one new entry by the admin.
	for (const { id } of [emailEdit, commentEdit]) {
		expect(
			await db.history.findUniqueOrThrow({ where: { id } }),
		).toMatchObject({ oldValue: null, newValue: null });
	}
	const deletion = await db.history.findMany({
		where: { recordId: applicant.id, fieldName: "deletedAt" },
	});
	expect(deletion).toHaveLength(1);
	expect(deletion[0].createdById).toBe("e2e-admin");
	expect(JSON.stringify(deletion[0])).not.toContain(applicant.email!);
});

test("Mégse closes the dialog without changing anything", async ({
	page,
	factory,
	db,
}) => {
	const applicant = await factory.applicant();

	const dialog = await openDeleteDialog(page, applicant.id);
	await dialog.getByRole("checkbox", { name: ACKNOWLEDGE }).click();
	await dialog.getByRole("button", { name: "Mégse" }).click();

	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(`/applicants/${applicant.id}`);
	expect(
		await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } }),
	).toMatchObject({ lastName: applicant.lastName, deletedAt: null });
});

test("anonymizing one of a duplicate pair clears the other's flag", async ({
	page,
	factory,
	db,
}) => {
	const [first, second] = await factory.duplicatePair();

	const dialog = await openDeleteDialog(page, first.id);
	await dialog.getByRole("checkbox", { name: ACKNOWLEDGE }).click();
	await dialog.getByRole("button", { name: "Törlés" }).click();
	await expect(page).toHaveURL("/applicants");

	expect(
		await db.applicant.findUniqueOrThrow({ where: { id: second.id } }),
	).toMatchObject({ duplicateFlag: false, deletedAt: null });
});
