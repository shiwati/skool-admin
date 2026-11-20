/** Visszajelzések megjelenítése (kliensről és szerverről is importálható). */
import { EMPTY } from "@/lib/applicants/format";
import type { Answers } from "./parse";
import { ROLE_LABELS, type FeedbackRoleKey } from "./questions";

const decimal = new Intl.NumberFormat("hu-HU", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("hu-HU", {
	style: "percent",
	maximumFractionDigits: 0,
});

/** 4.55 → "4,6"; hiányzó értéknél „—”. */
export function formatScore(value: number | null): string {
	return value === null ? EMPTY : decimal.format(value);
}

/** 0.64 → "64%"; hiányzó értéknél „—”. */
export function formatRate(value: number | null): string {
	return value === null ? EMPTY : percent.format(value).replace(/\s/g, "");
}

const NOTE_KEYS: Record<FeedbackRoleKey, string[]> = {
	PARTICIPANT: ["favoriteTopic", "feeling", "otherComment", "messageToGirls"],
	MENTOR: ["highlight", "otherComment", "leastLiked"],
};

/** A listában mutatott rövid szöveges válasz. */
export function feedbackNote(role: FeedbackRoleKey, answers: Answers): string {
	for (const key of NOTE_KEYS[role]) {
		const value = answers[key];
		if (typeof value === "string" && value.trim()) return value;
	}
	return "";
}

/** „Résztvevő · 2014 · más város” – névtelen kitöltő leírása. */
export function respondentLabel(
	role: FeedbackRoleKey,
	answers: Answers,
): string {
	const parts: string[] = [ROLE_LABELS[role]];
	if (typeof answers.birthYear === "number") {
		parts.push(`szül. ${answers.birthYear}`);
	}
	if (typeof answers.settlement === "string") parts.push(answers.settlement);
	return parts.join(" · ");
}

export type FeedbackUrlState = {
	q?: string;
	role?: FeedbackRoleKey;
	eventId?: string;
	page?: number;
	open?: string;
};

/** Az URL-ben tárolt listaállapot `?…` része (üres értékek kihagyva). */
export function feedbackSearch(state: FeedbackUrlState): string {
	const params = new URLSearchParams();
	if (state.q) params.set("q", state.q);
	if (state.role) params.set("role", state.role);
	if (state.eventId) params.set("eventId", state.eventId);
	if (state.page && state.page > 1) params.set("page", String(state.page));
	if (state.open) params.set("open", state.open);
	const text = params.toString();
	return text ? `?${text}` : "";
}

/** A program saját Visszajelzések füle. */
export function eventFeedbackHref(eventId: string): string {
	return `/events/${encodeURIComponent(eventId)}/feedback`;
}
