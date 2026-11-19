import { STATUS_LABELS } from "./format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "./types";

/**
 * Az adatlap feliratai. Kliensről is importálható (nincs benne
 * `server-only` és Prisma).
 */

/** A jelentkezési űrlap szabad szöveges válaszai, megjelenítési sorrendben. */
export const FORM_ANSWER_FIELDS = [
	{ field: "heardFromWhere", label: "Honnan hallottál rólunk?" },
	{ field: "heardFromWhom", label: "Kitől hallottál rólunk?" },
	{ field: "solvedProblem", label: "Milyen problémát oldanál meg?" },
	{ field: "pastExpInProg", label: "Van programozási tapasztalatod?" },
	{
		field: "pastParticipationSkool",
		label: "Részt vettél már Skool programon?",
	},
	{ field: "pastParticipationSkoolDesc", label: "Korábbi Skool program" },
	{ field: "pastParticipationOther", label: "Más programok" },
	{ field: "foodPreference", label: "Étkezési igény" },
	{ field: "comment", label: "Megjegyzés" },
] as const;

export type FormAnswerField = (typeof FORM_ANSWER_FIELDS)[number]["field"];

/** History `fieldName` (Prisma-mezőnév) → magyar felirat. */
export const HISTORY_FIELD_LABELS: Record<string, string> = {
	firstName: "Keresztnév",
	lastName: "Vezetéknév",
	birthYear: "Születési év",
	schoolName: "Iskola",
	hometown: "Település",
	phoneNumber: "Telefon",
	email: "E-mail",
	parentFirstName: "Szülő keresztneve",
	parentLastName: "Szülő vezetékneve",
	parentMothersName: "Szülő anyja neve",
	parentAddress: "Szülő címe",
	parentEmail: "Szülő e-mail",
	parentPhone: "Szülő telefon",
	newsletter: "Hírlevél",
	deletedAt: "Törlés",
	status: "Státusz",
	eventId: "Program",
	foodPreference: "Étkezési igény",
	heardFromWhere: "Honnan hallott rólunk",
	heardFromWhom: "Kitől hallott rólunk",
	solvedProblem: "Megoldandó probléma",
	pastExpInProg: "Programozási tapasztalat",
	pastParticipationOther: "Más programok",
	pastParticipationSkool: "Korábbi Skool részvétel",
	pastParticipationSkoolDesc: "Korábbi Skool program",
	comment: "Megjegyzés",
	companyAwareness: "Céges tájékoztatás",
};

/** Ismeretlen mezőnél a technikai név jelenik meg. */
export function historyFieldLabel(field: string): string {
	return HISTORY_FIELD_LABELS[field] ?? field;
}

function isStatus(value: string): value is ApplicationStatus {
	return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** A History érték megjelenítése: a státuszok a feliratukkal. */
export function historyValue(
	field: string,
	value: string | null,
): string | null {
	if (value === null) return null;
	if (field === "status" && isStatus(value)) return STATUS_LABELS[value];
	return value;
}
