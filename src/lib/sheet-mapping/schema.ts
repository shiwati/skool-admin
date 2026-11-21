import { z } from "zod";
import {
	MENTOR_QUESTIONS,
	PARTICIPANT_QUESTIONS,
	TIMESTAMP_KEY,
	type FeedbackRoleKey,
	type FeedbackSheetMapping,
} from "@/lib/feedback/questions";
import {
	APPLICATION_FIELD_LABELS,
	REQUIRED_FIELDS,
	type ApplicationSheetMapping,
} from "@/lib/sheet-import/mapping";

/**
 * Az eventenként mentett sheet-megfeleltetések sémái. Kliensről is
 * importálható. Minden hiba a mező gyökerén jelenik meg (egy üzenetben),
 * hogy az űrlap egy helyen mutathassa.
 */

const MAX_HEADER = 500;
const MAX_LABEL = 200;
const MAX_CUSTOM = 50;

const required = (labels: string[]) =>
	`Kötelező mezőhöz nincs oszlop rendelve: ${labels.join(", ")}.`;

export const applicationSheetMappingSchema = z
	.record(z.string(), z.string().max(MAX_HEADER))
	.superRefine((value, ctx) => {
		const unknown = Object.keys(value).filter(
			(key) => !(key in APPLICATION_FIELD_LABELS),
		);
		if (unknown.length) {
			ctx.addIssue({
				code: "custom",
				message: `Ismeretlen mező: ${unknown.join(", ")}.`,
			});
		}
		const missing = REQUIRED_FIELDS.filter((key) => !value[key]?.trim());
		if (missing.length) {
			ctx.addIssue({
				code: "custom",
				message: required(
					missing.map((key) => APPLICATION_FIELD_LABELS[key]),
				),
			});
		}
	})
	.transform(
		(value) =>
			Object.fromEntries(
				Object.entries(value)
					.map(([key, header]) => [key, header.trim()])
					.filter(([, header]) => header),
			) as ApplicationSheetMapping,
	);

const customQuestionSchema = z.object({
	label: z.string().max(MAX_LABEL),
	kind: z.enum(["scale", "text", "choice"]),
	header: z.string().max(MAX_HEADER),
});

const CATALOG: Record<FeedbackRoleKey, typeof PARTICIPANT_QUESTIONS> = {
	PARTICIPANT: PARTICIPANT_QUESTIONS,
	MENTOR: MENTOR_QUESTIONS,
};

export function feedbackSheetMappingSchema(role: FeedbackRoleKey) {
	const questions = CATALOG[role];
	const known = new Set([TIMESTAMP_KEY, ...questions.map((q) => q.key)]);
	return z
		.object({
			columns: z.record(z.string(), z.string().max(MAX_HEADER)),
			custom: z.array(customQuestionSchema).max(MAX_CUSTOM),
		})
		.superRefine((value, ctx) => {
			const issue = (message: string) =>
				ctx.addIssue({ code: "custom", message });
			const unknown = Object.keys(value.columns).filter(
				(key) => !known.has(key),
			);
			if (unknown.length) {
				issue(`Ismeretlen kérdés: ${unknown.join(", ")}.`);
			}
			const missing = [
				...(value.columns[TIMESTAMP_KEY]?.trim() ? [] : ["Időbélyeg"]),
				...questions
					.filter((q) => q.required && !value.columns[q.key]?.trim())
					.map((q) => q.label),
			];
			if (missing.length) issue(required(missing));

			const labels = value.custom.map((c) => c.label.trim());
			if (labels.some((label) => !label)) {
				issue("Minden egyéni kérdésnek adj nevet.");
			}
			if (new Set(labels).size !== labels.length) {
				issue("Két egyéni kérdésnek nem lehet ugyanaz a neve.");
			}
			if (value.custom.some((c) => !c.header.trim())) {
				issue("Minden egyéni kérdéshez válassz oszlopot.");
			}
			// Custom answers are stored under `custom:<label>`, so they never
			// collide with catalog keys; the clash to avoid is a custom
			// question named like a catalog question.
			const catalogLabels = new Set(
				questions.map((q) => q.label.trim().toLocaleLowerCase("hu")),
			);
			if (
				labels.some((label) =>
					catalogLabels.has(label.toLocaleLowerCase("hu")),
				)
			) {
				issue("Az egyéni kérdés neve ütközik egy meglévő kérdéssel.");
			}
		})
		.transform((value): FeedbackSheetMapping => ({
			columns: Object.fromEntries(
				Object.entries(value.columns)
					.map(([key, header]) => [key, header.trim()])
					.filter(([, header]) => header),
			),
			custom: value.custom.map((c) => ({
				label: c.label.trim(),
				kind: c.kind,
				header: c.header.trim(),
			})),
		}));
}

/** Az adatbázisban tárolt JSON beolvasása; érvénytelen vagy üres → alapértelmezett. */
export function readApplicationMapping(
	value: unknown,
): ApplicationSheetMapping | null {
	if (value === null || value === undefined) return null;
	const parsed = applicationSheetMappingSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

export function readFeedbackMapping(
	role: FeedbackRoleKey,
	value: unknown,
): FeedbackSheetMapping | null {
	if (value === null || value === undefined) return null;
	const parsed = feedbackSheetMappingSchema(role).safeParse(value);
	return parsed.success ? parsed.data : null;
}
