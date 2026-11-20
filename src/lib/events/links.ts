/** Programokhoz vezető útvonalak (kliensről és szerverről is importálható). */

/** Egy program jelentkezői a Jelentkezők listán, erre a programra szűrve. */
export function applicantsHref(eventId: string) {
	return `/applicants?eventIds=${encodeURIComponent(eventId)}`;
}

/** A program saját oldala. */
export function eventHref(eventId: string) {
	return `/events/${encodeURIComponent(eventId)}`;
}

export function eventEditHref(eventId: string) {
	return `/events/${encodeURIComponent(eventId)}/edit`;
}

/** A program záró riportja. */
export function eventReportHref(eventId: string) {
	return `/events/${encodeURIComponent(eventId)}/report`;
}
