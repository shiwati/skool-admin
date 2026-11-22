import { z } from "zod";

/**
 * A záró riport appban szerkesztett része (`EventReport.content`). Kliensről
 * és szerverről is használható (nincs benne `server-only` és Prisma).
 */

export const MAX_QUOTES = 8;
export const MAX_HIGHLIGHTED = 2;
export const MAX_PEOPLE = 40;

const trimmed = (max: number) => z.string().trim().max(max);

export const reportPersonSchema = z.object({
	role: trimmed(60).min(1, "Kötelező"),
	organization: trimmed(120),
	name: trimmed(120).min(1, "Kötelező"),
});

export const reportQuoteSchema = z.object({
	feedbackId: z.string().min(1).max(64),
	questionKey: z.string().min(1).max(64),
	text: trimmed(1000).min(1, "Kötelező"),
	highlighted: z.boolean(),
});

export const reportContentSchema = z
	.object({
		people: z.array(reportPersonSchema).max(MAX_PEOPLE),
		quotes: z.array(reportQuoteSchema).max(MAX_QUOTES),
		disabledMetrics: z.array(z.string().max(64)).max(100),
	})
	.refine(
		(c) => c.quotes.filter((q) => q.highlighted).length <= MAX_HIGHLIGHTED,
		{
			message: `Legfeljebb ${MAX_HIGHLIGHTED} kiemelt idézet lehet.`,
			path: ["quotes"],
		},
	)
	.refine(
		(c) =>
			new Set(c.quotes.map((q) => quoteId(q))).size === c.quotes.length,
		{ message: "Egy idézet csak egyszer szerepelhet.", path: ["quotes"] },
	);

export type ReportPerson = z.infer<typeof reportPersonSchema>;
export type ReportQuote = z.infer<typeof reportQuoteSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;

export function quoteId(q: { feedbackId: string; questionKey: string }) {
	return `${q.feedbackId}:${q.questionKey}`;
}

/** Alapértelmezés a programból: oktató (Skool) és mentorok (partnercég). */
export function defaultReportContent(event: {
	instructor: string | null;
	mentors: string[];
	companyName: string | null;
}): ReportContent {
	const people: ReportPerson[] = [];
	if (event.instructor?.trim()) {
		people.push({
			role: "Oktató",
			organization: "Skool",
			name: event.instructor.trim(),
		});
	}
	for (const name of event.mentors) {
		if (!name.trim()) continue;
		people.push({
			role: "Mentor",
			organization: event.companyName?.trim() ?? "",
			name: name.trim(),
		});
	}
	return { people, quotes: [], disabledMetrics: [] };
}

/** A mentett JSON értelmezése; sérült tartalom helyett az alapértelmezés. */
export function parseStoredContent(
	stored: unknown,
	fallback: ReportContent,
): ReportContent {
	const parsed = reportContentSchema.safeParse(stored);
	return parsed.success ? parsed.data : fallback;
}

/** A riport-végpontok törzse `{ content }`; a séma a `content`-et kapja. */
export const selectContent = (body: unknown) =>
	(body as { content?: unknown } | null)?.content;
