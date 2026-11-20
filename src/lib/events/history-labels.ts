import { formatDateTime } from "@/lib/applicants/format";
import type { TrackedEventField } from "./changes";
import { formatAgeRange } from "./format";

/**
 * A program változástörténetének feliratai. Kliensről is importálható
 * (nincs benne `server-only` és Prisma).
 */

/** History `fieldName` (Prisma-mezőnév) → magyar felirat (az űrlap feliratai szerint). */
export const EVENT_HISTORY_FIELD_LABELS: Record<TrackedEventField, string> = {
	name: "Program neve",
	from: "Kezdés",
	to: "Befejezés",
	companyName: "Helyszín / partnercég",
	location: "Cím",
	description: "Rövid leírás",
	tags: "Címkék",
	applicationSheetUrl: "Jelentkezők sheetje",
	participantFeedbackSheetUrl: "Résztvevői visszajelzések sheetje",
	mentorFeedbackSheetUrl: "Mentori visszajelzések sheetje",
	applicationSheetMapping: "Jelentkezők sheetjének mező-megfeleltetése",
	participantFeedbackSheetMapping:
		"Résztvevői visszajelzések mező-megfeleltetése",
	mentorFeedbackSheetMapping: "Mentori visszajelzések mező-megfeleltetése",
	ageRange: "Korosztály",
	instructor: "Oktató",
	mentors: "Mentorok",
	capacity: "Max. tanulói létszám",
};

/** Nem mezőváltozás, hanem esemény a programon (pl. riport generálása). */
const EVENT_HISTORY_ACTION_LABELS: Record<string, string> = {
	reportDocument: "Záró riport (Google Doc)",
};

/** Ismeretlen mezőnél a technikai név jelenik meg. */
export function eventHistoryFieldLabel(field: string): string {
	return (
		(EVENT_HISTORY_FIELD_LABELS as Record<string, string | undefined>)[
			field
		] ??
		EVENT_HISTORY_ACTION_LABELS[field] ??
		field
	);
}

function parseList(value: string): string[] | null {
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) &&
			parsed.every((v) => typeof v === "string")
			? parsed
			: null;
	} catch {
		return null;
	}
}

/**
 * A History érték megjelenítése: dátumok budapesti időben, listák
 * vesszővel, a korosztály évekkel. Üres érték `null` (a hívó „—”-t ír).
 */
export function eventHistoryValue(
	field: string,
	value: string | null,
): string | null {
	if (value === null) return null;
	if (field === "from" || field === "to") return formatDateTime(value);
	if (field === "tags" || field === "mentors") {
		const list = parseList(value);
		return list ? list.join(", ") : value;
	}
	if (field === "ageRange") return formatAgeRange(value);
	if (field.endsWith("SheetMapping")) return "Egyéni megfeleltetés";
	return value;
}
