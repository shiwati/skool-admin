import type {
	ApplicantDetail,
	ApplicantDetailApplication,
} from "@/lib/applicants/detail";

export const NOW = new Date("2026-11-19T12:00:00Z");

export function detailApplication(
	overrides: Partial<ApplicantDetailApplication> = {},
): ApplicantDetailApplication {
	return {
		id: "app1",
		receivedAt: new Date("2026-10-02T16:41:00Z"),
		status: "ACCEPTED",
		heardFromWhere: null,
		heardFromWhom: null,
		solvedProblem: null,
		pastExpInProg: null,
		pastParticipationSkool: false,
		pastParticipationSkoolDesc: null,
		pastParticipationOther: null,
		foodPreference: null,
		comment: null,
		event: {
			id: "e1",
			name: "Python alapok – ősz",
			from: new Date("2026-11-21T09:00:00Z"),
			to: new Date("2026-12-12T15:00:00Z"),
		},
		...overrides,
	};
}

/** Nagy Luca a spec forgatókönyveiből. */
export function detailApplicant(
	overrides: Partial<ApplicantDetail> = {},
): ApplicantDetail {
	return {
		id: "a1",
		createdAt: new Date("2026-10-02T16:41:00Z"),
		updatedAt: new Date("2026-10-05T12:30:00Z"),
		firstName: "Luca",
		lastName: "Nagy",
		birthYear: 2010,
		schoolName: "Fazekas Mihály Gimnázium",
		hometown: "Budapest",
		phoneNumber: "+36 30 555 1234",
		email: "nagy.luca@example.com",
		parentFirstName: "Péter",
		parentLastName: "Nagy",
		parentMothersName: "Kiss Mária",
		parentAddress: "1081 Budapest, Fő utca 1.",
		parentEmail: "nagy.peter@example.com",
		parentPhone: "+36 20 333 4455",
		newsletter: true,
		applications: [
			detailApplication(),
			detailApplication({
				id: "app2",
				status: "ATTENDED",
				receivedAt: new Date("2025-06-01T10:00:00Z"),
				event: {
					id: "e2",
					name: "Robotika tábor",
					from: new Date("2025-07-14T08:00:00Z"),
					to: new Date("2025-07-18T15:00:00Z"),
				},
			}),
		],
		history: [],
		...overrides,
	};
}
