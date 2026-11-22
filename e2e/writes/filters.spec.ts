import type { Page } from "@playwright/test";
import { exportCsv } from "../support/csv";
import { rowNames } from "../support/table";
import { expect, test } from "../support/test";

/**
 * Szűrők a valódi Postgres-lekérdezéseken (applicant-list, event-list
 * spec). Minden lekérdezés a teszt tokenjével szűkít, így csak a saját
 * adatát látja; a sorrendtől függetlenül, halmazként hasonlít.
 */

/** A Jelentkezők lista sorainak nevei a megadott query-vel. */
async function applicantsFor(page: Page, query: string) {
	await page.goto(`/applicants?${query}`);
	const table = page.getByRole("table", { name: "Jelentkezők" });
	await expect(table.locator("tbody")).not.toHaveAttribute("aria-busy");
	// A data row or the empty-state row: never read a list not rendered yet.
	await expect(table.locator("tbody > tr").first()).toBeVisible();
	if (await table.getByText("Nincs a szűrésnek megfelelő").count()) return [];
	return (await rowNames(table).allTextContents()).sort();
}

/** A Programok lista sorainak nevei a megadott query-vel. */
async function eventsFor(page: Page, query: string) {
	await page.goto(`/events?${query}`);
	const table = page.getByRole("table", { name: "Programok" });
	await expect(table.locator("tbody > tr").first()).toBeVisible();
	if (await table.getByText("Nincs a szűrésnek megfelelő").count()) return [];
	return (await rowNames(table).allTextContents()).sort();
}

const names = (...list: { lastName: string; firstName: string }[]) =>
	list.map((a) => `${a.lastName} ${a.firstName}`).sort();

test.describe("applicants", () => {
	test("search matches every word in the name or e-mail, ignoring case", async ({
		page,
		factory,
	}) => {
		const t = factory.token;
		const anna = await factory.applicant({
			lastName: "Kovács",
			firstName: "Anna",
			email: `anna.${t}@freemail.hu`,
		});
		const bela = await factory.applicant({
			lastName: "Kovács",
			firstName: "Béla",
			email: `bela.${t}@example.com`,
		});
		const szabo = await factory.applicant({
			lastName: "Szabó",
			firstName: "Anna",
			email: `${t}@example.com`,
		});
		const q = (words: string) => `q=${encodeURIComponent(`${t} ${words}`)}`;

		expect(await applicantsFor(page, q("kovács"))).toEqual(
			names(anna, bela),
		);
		expect(await applicantsFor(page, q("KOVÁCS anna"))).toEqual(
			names(anna),
		);
		expect(await applicantsFor(page, q("Anna"))).toEqual(
			names(anna, szabo),
		);
		expect(await applicantsFor(page, q("FREEMAIL"))).toEqual(names(anna));
	});

	test("age range filters by age, without birth year left out", async ({
		page,
		factory,
	}) => {
		// The server computes age from its own current year, as here.
		const year = new Date().getFullYear();
		const [a15, a16, a17] = [
			await factory.applicant({ birthYear: year - 15 }),
			await factory.applicant({ birthYear: year - 16 }),
			await factory.applicant({ birthYear: year - 17 }),
		];
		await factory.applicant({ birthYear: null });
		const q = `q=${factory.token}`;

		expect(await applicantsFor(page, `${q}&ageFrom=16&ageTo=16`)).toEqual(
			names(a16),
		);
		expect(await applicantsFor(page, `${q}&ageFrom=16`)).toEqual(
			names(a16, a17),
		);
		expect(await applicantsFor(page, `${q}&ageTo=15`)).toEqual(names(a15));
	});

	test("Előzmény counts attended programs only", async ({
		page,
		factory,
	}) => {
		const [first, second] = [await factory.event(), await factory.event()];
		const none = await factory.applicant();
		const one = await factory.applicant();
		const two = await factory.applicant();
		await factory.application({ applicant: none, event: first });
		await factory.application({
			applicant: one,
			event: first,
			status: "ATTENDED",
		});
		await factory.application({ applicant: one, event: second });
		for (const event of [first, second]) {
			await factory.application({
				applicant: two,
				event,
				status: "ATTENDED",
			});
		}
		const q = `q=${factory.token}`;

		expect(
			await applicantsFor(page, `${q}&historyFrom=1&historyTo=1`),
		).toEqual(names(one));
		expect(await applicantsFor(page, `${q}&historyFrom=2`)).toEqual(
			names(two),
		);
		expect(await applicantsFor(page, `${q}&historyTo=0`)).toEqual(
			names(none),
		);
	});

	test("Program éve uses the start year in Budapest time", async ({
		page,
		factory,
	}) => {
		// 2030-12-31 23:30 UTC is already 2031-01-01 00:30 in Budapest;
		// 2031-12-31 22:30 UTC is still 2031-12-31 23:30 there.
		const newYear = await factory.event({
			from: new Date("2030-12-31T23:30:00Z"),
			to: new Date("2031-01-02T10:00:00Z"),
		});
		const newYearsEve = await factory.event({
			from: new Date("2031-12-31T22:30:00Z"),
			to: new Date("2032-01-01T10:00:00Z"),
		});
		const nextYear = await factory.event({
			from: new Date("2031-12-31T23:30:00Z"),
			to: new Date("2032-01-02T10:00:00Z"),
		});
		const [a, b, c] = [
			await factory.applicant(),
			await factory.applicant(),
			await factory.applicant(),
		];
		await factory.application({ applicant: a, event: newYear });
		await factory.application({ applicant: b, event: newYearsEve });
		await factory.application({ applicant: c, event: nextYear });
		const q = `q=${factory.token}`;

		expect(await applicantsFor(page, `${q}&programYear=2031`)).toEqual(
			names(a, b),
		);
		expect(await applicantsFor(page, `${q}&programYear=2032`)).toEqual(
			names(c),
		);
		expect(await applicantsFor(page, `${q}&programYear=2030`)).toEqual([]);
		// Several programs: an application to any of them.
		expect(
			await applicantsFor(
				page,
				`${q}&eventIds=${newYear.id},${nextYear.id}`,
			),
		).toEqual(names(a, c));

		// The programs list uses the same year rule.
		expect(await eventsFor(page, `q=${factory.token}&year=2031`)).toEqual(
			[newYear.name, newYearsEve.name].sort(),
		);
	});
});

test.describe("programs", () => {
	test("tag, place, company and instructor filters, and the tab counts", async ({
		page,
		factory,
	}) => {
		const future = {
			from: new Date("2031-03-01"),
			to: new Date("2031-03-03"),
		};
		const robotika = await factory.event({
			...future,
			tags: ["robotika"],
			location: "Debrecen, Fo ter 1.",
			companyName: "Minta Robotics Kft.",
			instructor: "Kiss Peter",
		});
		const python = await factory.event({
			from: new Date("2020-03-01"),
			to: new Date("2020-03-03"),
			tags: ["python"],
			location: "Online",
			companyName: "Pelda Szoftver Zrt.",
			instructor: "Nagy Anna",
		});
		const both = await factory.event({
			...future,
			tags: ["robotika", "python"],
			location: "Pecs",
			companyName: null,
			instructor: null,
		});
		const q = `q=${factory.token}`;
		const sorted = (...list: { name: string }[]) =>
			list.map((e) => e.name).sort();

		expect(await eventsFor(page, `${q}&tags=robotika`)).toEqual(
			sorted(robotika, both),
		);
		// Any of the tags matches.
		expect(await eventsFor(page, `${q}&tags=robotika&tags=python`)).toEqual(
			sorted(robotika, python, both),
		);
		// "Helyszín / partner": location or partner company.
		expect(await eventsFor(page, `${q}&place=PELDA`)).toEqual(
			sorted(python),
		);
		expect(await eventsFor(page, `${q}&place=debrecen`)).toEqual(
			sorted(robotika),
		);
		// "Cég": the partner company only.
		expect(await eventsFor(page, `${q}&companyName=robotics`)).toEqual(
			sorted(robotika),
		);
		expect(await eventsFor(page, `${q}&companyName=pecs`)).toEqual([]);
		expect(await eventsFor(page, `${q}&instructor=kiss`)).toEqual(
			sorted(robotika),
		);

		// Tab counts follow the other filters.
		const tabs = page.getByRole("navigation", {
			name: "Programok szakasz szerint",
		});
		await page.goto(`/events?${q}&tags=robotika`);
		await expect(tabs.getByRole("link", { name: /^Összes/ })).toHaveText(
			/2$/,
		);
		await expect(tabs.getByRole("link", { name: /^Jövőbeli/ })).toHaveText(
			/2$/,
		);
		await expect(tabs.getByRole("link", { name: /^Múltbeli/ })).toHaveText(
			/0$/,
		);
		await page.goto(`/events?${q}&tab=closed`);
		expect(
			(
				await rowNames(
					page.getByRole("table", { name: "Programok" }),
				).allTextContents()
			).sort(),
		).toEqual(sorted(python));
	});
});

test.describe("accents are ignored", () => {
	test("kovacs finds Kovács but not Kocsis; accents typed find plain text", async ({
		page,
		factory,
	}) => {
		const t = factory.token;
		const kovacs = await factory.applicant({
			lastName: "Kovács",
			firstName: "Anna",
			email: `${t}a@example.com`,
		});
		await factory.applicant({
			lastName: "Kocsis",
			firstName: "Anna",
			email: `${t}b@example.com`,
		});
		const plain = await factory.applicant({
			lastName: "Kovacs",
			firstName: "Bela",
			email: `${t}c@example.com`,
		});
		const q = (words: string) => `q=${encodeURIComponent(`${t} ${words}`)}`;

		expect(await applicantsFor(page, q("kovacs anna"))).toEqual(
			names(kovacs),
		);
		expect(await applicantsFor(page, q("Kovács Béla"))).toEqual(
			names(plain),
		);
	});

	test("the Település filter ignores accents", async ({ page, factory }) => {
		const pecs = await factory.applicant({ hometown: "Pécs" });
		await factory.applicant({ hometown: "Pest" });

		expect(
			await applicantsFor(page, `q=${factory.token}&hometown=pecs`),
		).toEqual(names(pecs));
	});

	test("the program chips ignore accents", async ({ page, factory }) => {
		const gyor = await factory.event({
			location: "Győr, Fő tér 1.",
			instructor: "Kiss Péter",
			companyName: "Példa Kft.",
		});
		await factory.event({ location: "Budapest" });
		const q = `q=${factory.token}`;

		for (const filter of [
			"place=gyor",
			"instructor=peter",
			"companyName=pelda",
		]) {
			expect(await eventsFor(page, `${q}&${filter}`), filter).toEqual([
				gyor.name,
			]);
		}
	});

	test("the feedback search ignores accents", async ({ page, factory }) => {
		const event = await factory.event();
		await factory.feedback({ event, text: "Nagyon élveztem a tábort" });
		await factory.feedback({ event, text: "Nem tetszett" });

		await page.goto(
			`/feedback?eventId=${event.id}&q=${encodeURIComponent("elveztem a tabort")}`,
		);
		const rows = page
			.getByRole("table", { name: "Visszajelzések" })
			.locator("tbody > tr");
		await expect(rows).toHaveCount(1);
	});

	test("the CSV export follows the accent-insensitive search", async ({
		page,
		factory,
	}) => {
		const kovacs = await factory.applicant({
			lastName: "Kovács",
			firstName: "Anna",
			email: `${factory.token}@example.com`,
		});

		await page.goto(
			`/applicants?q=${encodeURIComponent(`${factory.token} kovacs`)}`,
		);
		const csv = await exportCsv(page);
		expect(csv.rows.map((row) => row[0])).toEqual([kovacs.lastName]);
	});

	test("a changed name is searchable at once, the old one is not", async ({
		page,
		factory,
		db,
	}) => {
		const t = factory.token;
		const applicant = await factory.applicant({
			lastName: "Kis",
			firstName: "Ádám",
			email: `${t}@example.com`,
		});
		await db.applicant.update({
			where: { id: applicant.id },
			data: { lastName: "Nagy" },
		});

		const q = (words: string) => `q=${encodeURIComponent(`${t} ${words}`)}`;
		expect(await applicantsFor(page, q("nagy adam"))).toEqual([
			"Nagy Ádám",
		]);
		expect(await applicantsFor(page, q("kis adam"))).toEqual([]);
	});

	test("an anonymized applicant is no longer found", async ({
		factory,
		request,
	}) => {
		const applicant = await factory.applicant({
			lastName: "Kovácsné",
			firstName: factory.token,
		});
		const found = async () => {
			const res = await request.get(
				"/api/applicants?q=kovacsne&pageSize=100",
			);
			const { items } = (await res.json()) as { items: { id: string }[] };
			return items.map((item) => item.id);
		};
		expect(await found()).toContain(applicant.id);

		const deleted = await request.post("/api/applicants/delete", {
			data: { ids: [applicant.id] },
		});
		expect(deleted.status()).toBe(200);
		expect(await found()).not.toContain(applicant.id);
	});
});
