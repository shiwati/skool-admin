import { z } from "zod";
import { REQUIRED_MESSAGE } from "@/lib/events/schema";

/**
 * A jelentkező-szerkesztő űrlap és a `POST /api/applicants/[id]/edit`
 * közös sémája. Kliensről is importálható (nincs benne `server-only`).
 */

export const EMAIL_MESSAGE = "Érvénytelen e-mail cím";
export const PHONE_MESSAGE =
	"Érvénytelen telefonszám. Csak számjegy, szóköz, +, -, ( ) lehet, 6–20 számjeggyel.";
export const MIN_BIRTH_YEAR = 1900;
export const birthYearMessage = (max: number) =>
	`${MIN_BIRTH_YEAR} és ${max} közötti évszám legyen.`;

const MAX_TEXT = 200;

const text = z
	.string()
	.trim()
	.max(MAX_TEXT, `Legfeljebb ${MAX_TEXT} karakter.`);
const requiredText = text.min(1, REQUIRED_MESSAGE);

/** E-mail domainvéggel (pl. `.com`); a `z.email()` szabályai szerint. */
const emailValue = z.email(EMAIL_MESSAGE).max(MAX_TEXT);
const requiredEmail = z
	.string()
	.trim()
	.min(1, REQUIRED_MESSAGE)
	.pipe(emailValue);
const optionalEmail = z
	.string()
	.trim()
	.refine((v) => v === "" || emailValue.safeParse(v).success, EMAIL_MESSAGE);

const optionalPhone = z
	.string()
	.trim()
	.refine((v) => {
		if (v === "") return true;
		if (!/^[\d\s+\-()]+$/.test(v)) return false;
		const digits = v.replace(/\D/g, "").length;
		return digits >= 6 && digits <= 20;
	}, PHONE_MESSAGE);

const optionalBirthYear = z
	.string()
	.trim()
	.superRefine((v, ctx) => {
		if (v === "") return;
		const max = new Date().getFullYear();
		const year = Number(v);
		if (!/^\d{4}$/.test(v) || year < MIN_BIRTH_YEAR || year > max) {
			ctx.addIssue({ code: "custom", message: birthYearMessage(max) });
		}
	});

/** Az űrlap értékei: minden szöveg (a születési év is), a hírlevél logikai. */
export const applicantEditSchema = z.object({
	lastName: requiredText,
	firstName: requiredText,
	birthYear: optionalBirthYear,
	email: requiredEmail,
	phoneNumber: optionalPhone,
	schoolName: text,
	hometown: text,
	parentLastName: text,
	parentFirstName: text,
	parentMothersName: text,
	parentAddress: text,
	parentEmail: optionalEmail,
	parentPhone: optionalPhone,
	newsletter: z.boolean(),
});

export type ApplicantEditValues = z.output<typeof applicantEditSchema>;
export type ApplicantEditField = keyof ApplicantEditValues;

/** A végpont törzse: az űrlap értékei + a betöltéskori módosítási idő. */
export const applicantEditRequestSchema = applicantEditSchema.extend({
	expectedUpdatedAt: z.iso.datetime(),
});

/** Az adatbázisba írt alak: üres szöveg → `null`, születési év → szám. */
export type ApplicantUpdate = {
	lastName: string;
	firstName: string;
	birthYear: number | null;
	email: string;
	phoneNumber: string | null;
	schoolName: string | null;
	hometown: string | null;
	parentLastName: string | null;
	parentFirstName: string | null;
	parentMothersName: string | null;
	parentAddress: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	newsletter: boolean;
};

const orNull = (v: string) => (v === "" ? null : v);

export function toApplicantUpdate(
	values: ApplicantEditValues,
): ApplicantUpdate {
	return {
		lastName: values.lastName,
		firstName: values.firstName,
		birthYear: values.birthYear === "" ? null : Number(values.birthYear),
		email: values.email,
		phoneNumber: orNull(values.phoneNumber),
		schoolName: orNull(values.schoolName),
		hometown: orNull(values.hometown),
		parentLastName: orNull(values.parentLastName),
		parentFirstName: orNull(values.parentFirstName),
		parentMothersName: orNull(values.parentMothersName),
		parentAddress: orNull(values.parentAddress),
		parentEmail: orNull(values.parentEmail),
		parentPhone: orNull(values.parentPhone),
		newsletter: values.newsletter,
	};
}

/** Az adatbázis alakjából az űrlap értékei (a hiányzó érték üres mező). */
export function toApplicantFormValues(
	applicant: Omit<ApplicantUpdate, "email"> & { email: string | null },
): ApplicantEditValues {
	const s = (v: string | null) => v ?? "";
	return {
		lastName: applicant.lastName,
		firstName: applicant.firstName,
		birthYear:
			applicant.birthYear === null ? "" : String(applicant.birthYear),
		email: s(applicant.email),
		phoneNumber: s(applicant.phoneNumber),
		schoolName: s(applicant.schoolName),
		hometown: s(applicant.hometown),
		parentLastName: s(applicant.parentLastName),
		parentFirstName: s(applicant.parentFirstName),
		parentMothersName: s(applicant.parentMothersName),
		parentAddress: s(applicant.parentAddress),
		parentEmail: s(applicant.parentEmail),
		parentPhone: s(applicant.parentPhone),
		newsletter: applicant.newsletter,
	};
}

/** A mezők magyar felirata (űrlap, hibaösszegző). */
export const APPLICANT_FIELD_LABELS: Record<ApplicantEditField, string> = {
	lastName: "Vezetéknév",
	firstName: "Keresztnév",
	birthYear: "Születési év",
	email: "E-mail",
	phoneNumber: "Telefon",
	schoolName: "Iskola",
	hometown: "Település",
	parentLastName: "Szülő vezetékneve",
	parentFirstName: "Szülő keresztneve",
	parentMothersName: "Anyja neve",
	parentAddress: "Cím",
	parentEmail: "Szülő e-mail",
	parentPhone: "Szülő telefon",
	newsletter: "Hírlevél",
};
