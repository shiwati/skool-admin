import type { Event } from "@prisma/client";

export const EVENT_TABLE = "event";

export const TRACKED_EVENT_FIELDS = [
	"name",
	"from",
	"to",
	"companyName",
	"location",
	"description",
	"tags",
	"applicationSheetUrl",
	"participantFeedbackSheetUrl",
	"mentorFeedbackSheetUrl",
	"ageRange",
	"instructor",
	"mentors",
	"capacity",
] as const satisfies readonly (keyof Event)[];

export type TrackedEventField = (typeof TRACKED_EVENT_FIELDS)[number];

export type EventPatch = Partial<Pick<Event, TrackedEventField>>;

/** A History `oldValue`/`newValue` szöveges alakja; az üres érték `null`. */
function serialize(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value))
		return value.length ? JSON.stringify(value) : null;
	return String(value);
}

export type EventFieldChange = {
	fieldName: TrackedEventField;
	oldValue: string | null;
	newValue: string | null;
};

/** A ténylegesen módosuló mezők; a változatlanok (és a nem küldöttek) kimaradnak. */
export function diffEvent(
	current: Pick<Event, TrackedEventField>,
	patch: EventPatch,
): EventFieldChange[] {
	const changes: EventFieldChange[] = [];
	for (const fieldName of TRACKED_EVENT_FIELDS) {
		if (!(fieldName in patch) || patch[fieldName] === undefined) continue;
		const oldValue = serialize(current[fieldName]);
		const newValue = serialize(patch[fieldName]);
		if (oldValue !== newValue)
			changes.push({ fieldName, oldValue, newValue });
	}
	return changes;
}
