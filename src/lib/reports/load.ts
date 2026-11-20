import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
	defaultReportContent,
	parseStoredContent,
	quoteId,
	type ReportContent,
} from "./content";
import { computeMetrics, type MetricResult } from "./metrics";
import {
	QUOTE_ROLE_LABELS,
	quoteCandidates,
	type QuoteCandidate,
} from "./quotes";
import type { ReportDocumentData } from "./render";

export type ReportDocumentItem = {
	id: string;
	title: string;
	docUrl: string;
	createdAt: Date;
	createdBy: string | null;
};

export type EventReportData = {
	event: {
		id: string;
		name: string;
		companyName: string | null;
		from: Date;
		to: Date;
		location: string | null;
		ageRange: string | null;
	};
	participants: number;
	content: ReportContent;
	saved: boolean;
	candidates: QuoteCandidate[];
	metrics: MetricResult[];
	documents: ReportDocumentItem[];
};

/** A riport szerkesztő adatai; ismeretlen eseménynél `null`. Kérésenként memoizált. */
export const getEventReport = cache(
	async (eventId: string): Promise<EventReportData | null> => {
		const event = await db.event.findUnique({
			where: { id: eventId },
			select: {
				id: true,
				name: true,
				companyName: true,
				from: true,
				to: true,
				location: true,
				ageRange: true,
				instructor: true,
				mentors: true,
				report: { select: { content: true } },
			},
		});
		if (!event) return null;

		const [participants, feedback, documents] = await Promise.all([
			db.application.count({
				where: {
					eventId,
					status: "ATTENDED",
					applicant: { deletedAt: null },
				},
			}),
			db.feedback.findMany({
				where: { eventId },
				select: {
					id: true,
					role: true,
					answers: true,
					recommend: true,
				},
				orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
			}),
			db.eventReportDocument.findMany({
				where: { eventId },
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					title: true,
					docUrl: true,
					createdAt: true,
					createdBy: { select: { name: true } },
				},
			}),
		]);

		const answersOf = (value: unknown) =>
			value && typeof value === "object"
				? (value as Record<string, unknown>)
				: {};
		const fallback = defaultReportContent(event);

		return {
			event: {
				id: event.id,
				name: event.name,
				companyName: event.companyName,
				from: event.from,
				to: event.to,
				location: event.location,
				ageRange: event.ageRange,
			},
			participants,
			content: event.report
				? parseStoredContent(event.report.content, fallback)
				: fallback,
			saved: Boolean(event.report),
			candidates: quoteCandidates(
				feedback.map((f) => ({
					id: f.id,
					role: f.role,
					answers: answersOf(f.answers),
				})),
			),
			metrics: computeMetrics(
				feedback
					.filter((f) => f.role === "PARTICIPANT")
					.map((f) => ({
						answers: answersOf(f.answers),
						recommend: f.recommend,
					})),
			),
			documents: documents.map((d) => ({
				id: d.id,
				title: d.title,
				docUrl: d.docUrl,
				createdAt: d.createdAt,
				createdBy: d.createdBy?.name ?? null,
			})),
		};
	},
);

/**
 * A dokumentum adatai a mentett tartalomból. Csak létező visszajelzésből
 * származó idézet kerül bele, és az idézet szerzője csak a szerep.
 */
export function toDocumentData(
	report: EventReportData,
	content: ReportContent,
): ReportDocumentData {
	const roles = new Map(report.candidates.map((c) => [c.id, c.role]));
	const quotes = content.quotes.flatMap((q) => {
		const role = roles.get(quoteId(q));
		return role
			? [
					{
						text: q.text,
						role: QUOTE_ROLE_LABELS[role],
						kind: role,
						highlighted: q.highlighted,
					},
				]
			: [];
	});
	const disabled = new Set(content.disabledMetrics);
	const metrics = report.metrics.flatMap((m) =>
		m.percent === null || disabled.has(m.key)
			? []
			: [{ key: m.key, percent: m.percent, phrase: m.phrase }],
	);
	const recommend = report.metrics.find((m) => m.key === "recommend");

	return {
		eventName: report.event.name,
		companyName: report.event.companyName,
		from: report.event.from,
		to: report.event.to,
		location: report.event.location,
		ageRange: report.event.ageRange,
		participants: report.participants,
		people: content.people,
		highlightedQuotes: quotes.filter((q) => q.highlighted),
		quotes: quotes.filter((q) => !q.highlighted),
		metrics,
		recommendPercent:
			recommend && !disabled.has("recommend") ? recommend.percent : null,
	};
}
