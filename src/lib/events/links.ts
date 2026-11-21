/** Programokhoz vezető útvonalak (kliensről és szerverről is importálható). */

import {
	toApplicationsSearchParams,
	type ApplicationsView,
} from "./applications-params";

/** Egy program jelentkezői a Jelentkezők listán, erre a programra szűrve. */
export function applicantsHref(eventId: string) {
	return `/applicants?eventIds=${encodeURIComponent(eventId)}`;
}

/**
 * A program Jelentkezők füle (jelentkezések tömeges státuszkezeléssel),
 * opcionálisan egy nézettel (pl. státuszszűrés); az alapértékek kimaradnak.
 */
export function eventApplicantsHref(
	eventId: string,
	view: Partial<ApplicationsView> = {},
) {
	const query = toApplicationsSearchParams(view).toString();
	const path = `/events/${encodeURIComponent(eventId)}/applicants`;
	return query ? `${path}?${query}` : path;
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
