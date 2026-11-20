import type { FeedbackRoleKey } from "@/lib/feedback/questions";

/**
 * A záró riport adatai és formázói (dátum, korosztály, cím). A dokumentum a
 * Google Doc sablonból készül, lásd `template.ts`.
 */

export type ReportQuote = { text: string; role: string; kind: FeedbackRoleKey };

export type ReportDocumentData = {
	eventName: string;
	companyName: string | null;
	from: Date;
	to: Date;
	location: string | null;
	ageRange: string | null;
	/** Az esemény rövid leírása (`{short_desc}`). */
	description: string | null;
	participants: number;
	people: { role: string; organization: string; name: string }[];
	highlightedQuotes: ReportQuote[];
	quotes: ReportQuote[];
	metrics: { key: string; percent: number; phrase: string }[];
	recommendPercent: number | null;
};

const TZ = "Europe/Budapest";

export function formatLongDate(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

function formatTime(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function sameDay(a: Date, b: Date) {
	return formatLongDate(a) === formatLongDate(b);
}

/** „2025. május 16., 15:00–18:30” vagy több napnál „2025. július 7. – 2025. július 11.” */
export function reportDateText(from: Date, to: Date): string {
	return sameDay(from, to)
		? `${formatLongDate(from)}, ${formatTime(from)}–${formatTime(to)}`
		: `${formatLongDate(from)} – ${formatLongDate(to)}`;
}

/** „10-12” → „10–12” (a sablonban utána áll az „évesek” szó). */
export function ageRangeText(ageRange: string | null): string | null {
	if (!ageRange?.trim()) return null;
	const match = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/.exec(ageRange.trim());
	return match ? `${match[1]}–${match[2]}` : ageRange.trim();
}

/** Egynapos programnál „2025. május 16.”, többnapos programnál a tartomány. */
export function reportDayText(from: Date, to: Date): string {
	return sameDay(from, to)
		? formatLongDate(from)
		: `${formatLongDate(from)} – ${formatLongDate(to)}`;
}

export function reportTitle(data: {
	eventName: string;
	companyName: string | null;
}): string {
	return data.companyName?.trim()
		? `${data.companyName.trim()} × Skool workshop – záró riport`
		: `${data.eventName} – záró riport`;
}

/** A Drive-fájl neve: cím + kezdő dátum. */
export function reportFileName(data: ReportDocumentData): string {
	return `${reportTitle(data)} – ${formatLongDate(data.from)}`;
}

export const isVolunteer = (role: string) => /mentor|önkéntes/i.test(role);
