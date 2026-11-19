import type { ApplicantListItem, ApplicantsPage } from "@/lib/applicants/types";

/** Shared test data for the applicants components (not used at runtime). */
export function applicant(
	overrides: Partial<ApplicantListItem> = {},
): ApplicantListItem {
	return {
		id: "a1",
		createdAt: "2026-10-02T08:00:00.000Z",
		firstName: "Luca",
		lastName: "Nagy",
		birthYear: 2010,
		schoolName: "Gimnázium",
		hometown: "Budapest",
		phoneNumber: "+36 30 123 4567",
		email: "nagy.luca@gmail.com",
		parentFirstName: "Éva",
		parentLastName: "Nagy",
		parentEmail: "nagy.eva@gmail.com",
		newsletter: true,
		applications: [
			{
				id: "app1",
				status: "ACCEPTED",
				receivedAt: "2026-10-02T08:00:00.000Z",
				event: {
					id: "e1",
					name: "Python alapok – ősz",
					from: "2026-10-10T08:00:00.000Z",
				},
			},
			{
				id: "app2",
				status: "ATTENDED",
				receivedAt: "2026-03-01T08:00:00.000Z",
				event: {
					id: "e2",
					name: "Robotika tábor",
					from: "2026-04-10T08:00:00.000Z",
				},
			},
		],
		...overrides,
	};
}

export const boroka = applicant({
	id: "a2",
	firstName: "Boróka",
	lastName: "Kiss",
	birthYear: 2013,
	email: "kiss.bori@freemail.hu",
	newsletter: false,
	schoolName: null,
	applications: [],
});

export const noEmail = applicant({
	id: "a3",
	firstName: "Lili",
	lastName: "Szabó",
	email: null,
});

export function pageOf(
	items: ApplicantListItem[],
	total = items.length,
	page = 1,
	pageSize = 25,
): ApplicantsPage {
	return { items, total, page, pageSize };
}

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}
