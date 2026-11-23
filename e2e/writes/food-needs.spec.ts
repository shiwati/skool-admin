import { expect, test } from "../support/test";

/** A program étkezési igény kártyája a program áttekintésén (event-overview spec). */

test("the program overview lists food needs by status, sorted by answer", async ({
	page,
	factory,
}) => {
	const event = await factory.event({ capacity: 10 });
	const anna = await factory.applicant({
		firstName: "Anna",
		lastName: "Kiss",
	});
	const bela = await factory.applicant({
		firstName: "Béla",
		lastName: "Nagy",
	});
	const cili = await factory.applicant({
		firstName: "Cili",
		lastName: "Tóth",
	});
	const rows = [
		{ applicant: anna, status: "ACCEPTED", answer: "vegetáriánus" },
		{ applicant: bela, status: "ACCEPTED", answer: "gluténmentes" },
		{ applicant: cili, status: "ATTENDED", answer: "laktózmentes" },
		{ status: "ACCEPTED", answer: "nincs" },
		{ status: "APPLIED", answer: "-" },
		{ status: "ATTENDED", answer: null },
		{ status: "WAITLISTED", answer: "tejmentes" },
		{ status: "REJECTED", answer: "dió" },
		{ status: "CANCELLED", answer: "mogyoró" },
	] as const;
	for (const { status, answer, ...rest } of rows) {
		await factory.application({
			applicant:
				"applicant" in rest
					? rest.applicant
					: await factory.applicant(),
			event,
			status,
			foodPreference: answer,
		});
	}

	await page.goto(`/events/${event.id}`);

	await expect(
		page.getByRole("heading", { name: "Étkezési igény" }),
	).toBeVisible();
	const accepted = page.getByRole("rowgroup", { name: "Elfogadva" });
	await expect(accepted.getByRole("row")).toHaveText([
		/Elfogadva/,
		/Nagy Béla\s*gluténmentes/,
		/Kiss Anna\s*vegetáriánus/,
	]);
	await expect(
		page.getByRole("rowgroup", { name: "Részt vett" }),
	).toContainText("Tóth Cili");
	await expect(page.getByRole("rowgroup", { name: "Várólista" })).toHaveCount(
		0,
	);
	await expect(
		page.getByText("Összesen 3 főnek nincs étkezési igénye."),
	).toBeVisible();
	await expect(page.getByText("tejmentes")).toHaveCount(0);
	await expect(page.getByText("dió")).toHaveCount(0);
	await expect(page.getByText("mogyoró")).toHaveCount(0);
});
