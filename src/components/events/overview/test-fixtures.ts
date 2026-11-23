import type { EventRecord } from "@/lib/search-columns";
import type { StatusCounts } from "@/lib/events/list";
import type { EventOverview } from "@/lib/events/overview";

export function overviewEvent(
	overrides: Partial<EventRecord> = {},
): EventRecord {
	return {
		id: "e1",
		createdAt: new Date("2026-10-01T09:00:00Z"),
		updatedAt: new Date("2026-11-01T09:00:00Z"),
		name: "Python alapok – ősz",
		from: new Date("2099-11-21T09:00:00Z"),
		to: new Date("2099-12-12T13:00:00Z"),
		companyName: "Sigma Technology",
		location: "Budapest, Infopark sétány 1.",
		description: "Négy szombati alkalom.",
		applicationSheetUrl:
			"https://docs.google.com/spreadsheets/d/abc/edit#gid=0",
		participantFeedbackSheetUrl: null,
		mentorFeedbackSheetUrl: null,
		applicationSheetMapping: null,
		participantFeedbackSheetMapping: null,
		mentorFeedbackSheetMapping: null,
		ageRange: "12-18",
		instructor: "Kiss Bence",
		mentors: ["Szűcs Petra"],
		tags: ["programozás"],
		capacity: 20,
		...overrides,
	};
}

export function overviewCounts(
	overrides: Partial<StatusCounts> = {},
): StatusCounts {
	return {
		total: 62,
		APPLIED: 24,
		ACCEPTED: 20,
		REJECTED: 0,
		ATTENDED: 0,
		WAITLISTED: 18,
		CANCELLED: 0,
		...overrides,
	};
}

export function eventOverview(
	overrides: Partial<EventOverview> = {},
): EventOverview {
	return {
		event: overviewEvent(),
		counts: overviewCounts(),
		history: [],
		...overrides,
	};
}
