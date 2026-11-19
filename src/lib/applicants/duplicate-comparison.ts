import { EMPTY, formatDateTime, fullName, STATUS_LABELS } from "./format";
import type { DuplicateApplicant } from "./types";

/**
 * A duplikáció-összehasonlító sorai (terv: 03.4). Kliensről is
 * importálható.
 */
export type ComparisonRow = {
	label: string;
	a: string;
	b: string;
	differs: boolean;
};

const text = (value: string | number | null | undefined) =>
	value === null || value === undefined || value === ""
		? EMPTY
		: String(value);

const parentName = (x: DuplicateApplicant) =>
	text(`${x.parentLastName ?? ""} ${x.parentFirstName ?? ""}`.trim());

const programs = (x: DuplicateApplicant) =>
	text(
		x.applications
			.map((app) => `${app.event.name} (${STATUS_LABELS[app.status]})`)
			.join(", "),
	);

const submitted = (x: DuplicateApplicant) =>
	x.applications[0] ? formatDateTime(x.applications[0].receivedAt) : EMPTY;

const FIELDS: { label: string; value: (x: DuplicateApplicant) => string }[] = [
	{ label: "Név", value: (x) => text(fullName(x)) },
	{ label: "Születési év", value: (x) => text(x.birthYear) },
	{ label: "E-mail", value: (x) => text(x.email) },
	{ label: "Telefon", value: (x) => text(x.phoneNumber) },
	{ label: "Iskola", value: (x) => text(x.schoolName) },
	{ label: "Település", value: (x) => text(x.hometown) },
	{ label: "Szülő neve", value: parentName },
	{ label: "Szülő anyja neve", value: (x) => text(x.parentMothersName) },
	{ label: "Szülő címe", value: (x) => text(x.parentAddress) },
	{ label: "Szülő e-mail", value: (x) => text(x.parentEmail) },
	{ label: "Szülő telefon", value: (x) => text(x.parentPhone) },
	{ label: "Hírlevél", value: (x) => (x.newsletter ? "Igen" : "Nem") },
	{ label: "Programok", value: programs },
	{ label: "Utolsó beküldés", value: submitted },
	{ label: "Rögzítve", value: (x) => formatDateTime(x.createdAt) },
];

export function comparisonRows(
	a: DuplicateApplicant,
	b: DuplicateApplicant,
): ComparisonRow[] {
	return FIELDS.map(({ label, value }) => {
		const va = value(a);
		const vb = value(b);
		return { label, a: va, b: vb, differs: va !== vb };
	});
}
