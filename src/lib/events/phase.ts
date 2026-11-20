/**
 * Események életciklusa a listához (kliensről is importálható).
 *
 * Nincs külön státuszmező: a szakasz a dátumokból és abból adódik, hogy
 * az eseményhez tartozik-e jelentkezési (Google Form) sheet.
 * Tervezett: még nem ért véget; Lezárt: véget ért.
 */
export const EVENT_PHASES = ["planned", "closed"] as const;

export type EventPhase = (typeof EVENT_PHASES)[number];

export const PHASE_LABELS: Record<EventPhase | "all", string> = {
	planned: "Tervezett",
	closed: "Lezárt",
	all: "Összes",
};

export type EventStatus = "open" | "full" | "running" | "planned" | "closed";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
	open: "Jelentkezés nyitva",
	full: "Betelt · várólista",
	running: "Folyamatban",
	planned: "Tervezett",
	closed: "Lezárva",
};

/** Státusz → badge színe (DS.2 „rendszer” tónusok). */
export const EVENT_STATUS_BADGE_CLASSES: Record<EventStatus, string> = {
	open: "bg-success-bg text-success-fg",
	full: "bg-warning-bg text-warning-fg",
	running: "bg-info-bg text-info-fg",
	planned: "bg-surface-subtle text-text-secondary",
	closed: "bg-surface-subtle text-text-primary",
};

type StatusInput = {
	from: string | Date;
	to: string | Date;
	applicationSheetUrl: string | null;
	capacity: number;
	applications: number;
};

/** Egy esemény megjelenített státusza az adott pillanatban. */
export function eventStatus(event: StatusInput, now: Date): EventStatus {
	const from = new Date(event.from).getTime();
	const to = new Date(event.to).getTime();
	const t = now.getTime();
	if (to < t) return "closed";
	if (from <= t) return "running";
	if (!event.applicationSheetUrl) return "planned";
	if (event.capacity > 0 && event.applications >= event.capacity)
		return "full";
	return "open";
}
