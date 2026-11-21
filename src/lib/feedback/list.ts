import "server-only";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { z } from "zod";
import { budapestYearRange } from "@/lib/api/query";
import { db } from "@/lib/db";
import type { Answers } from "./parse";
import type { Recommend } from "./questions";

export const FEEDBACK_PAGE_SIZE = 20;

const optionalText = z
	.string()
	.trim()
	.max(200)
	.optional()
	.transform((v) => v || undefined);

/** A Visszajelzések lista URL-paraméterei; az érvénytelen értékek alapértékre esnek vissza. */
export const feedbackQuerySchema = z.object({
	q: optionalText.catch(undefined),
	role: z.enum(["PARTICIPANT", "MENTOR"]).optional().catch(undefined),
	eventId: optionalText.catch(undefined),
	/** Naptári év (pl. „2026”): a program kezdete szerint. */
	period: z
		.string()
		.regex(/^\d{4}$/)
		.optional()
		.catch(undefined),
	page: z.coerce.number().int().min(1).catch(1).default(1),
	/** A megnyitott visszajelzés (részletek fiók). */
	open: optionalText.catch(undefined),
});

export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>;

/** Next `searchParams` → lekérdezés; ismételt paraméternél az első érték számít. */
export function parseFeedbackQuery(
	raw: Record<string, string | string[] | undefined>,
): FeedbackQuery {
	const first = Object.fromEntries(
		Object.entries(raw).map(([key, value]) => [
			key,
			Array.isArray(value) ? value[0] : value,
		]),
	);
	return feedbackQuerySchema.parse(first);
}

export type FeedbackListItem = {
	id: string;
	role: "PARTICIPANT" | "MENTOR";
	eventId: string;
	eventName: string;
	submittedAt: string | null;
	overallScore: number | null;
	recommend: Recommend | null;
	answers: Answers;
};

export type FeedbackStats = {
	count: number;
	averageScore: number | null;
	/** Igen arány az ajánlásra válaszolók között (0–1). */
	recommendRate: number | null;
	/** Résztvevői kitöltések / „Részt vett” jelentkezések (0–1). */
	responseRate: number | null;
};

export type FeedbackListPage = {
	items: FeedbackListItem[];
	total: number;
	page: number;
	pageSize: number;
	stats: FeedbackStats;
};

function where(query: FeedbackQuery): Prisma.FeedbackWhereInput {
	return {
		...(query.eventId && { eventId: query.eventId }),
		...(query.role && { role: query.role }),
		...(query.period && {
			event: { from: budapestYearRange(Number(query.period)) },
		}),
		...(query.q && {
			searchText: { contains: query.q.toLowerCase() },
		}),
	};
}

function toItem(row: {
	id: string;
	role: "PARTICIPANT" | "MENTOR";
	eventId: string;
	event: { name: string };
	submittedAt: Date | null;
	overallScore: number | null;
	recommend: string | null;
	answers: Prisma.JsonValue;
}): FeedbackListItem {
	return {
		id: row.id,
		role: row.role,
		eventId: row.eventId,
		eventName: row.event.name,
		submittedAt: row.submittedAt?.toISOString() ?? null,
		overallScore: row.overallScore,
		recommend: (row.recommend as Recommend | null) ?? null,
		answers: (row.answers ?? {}) as Answers,
	};
}

const itemSelect = {
	id: true,
	role: true,
	eventId: true,
	event: { select: { name: true } },
	submittedAt: true,
	overallScore: true,
	recommend: true,
	answers: true,
} as const;

async function stats(query: FeedbackQuery): Promise<FeedbackStats> {
	const filter = where(query);
	const [aggregate, recommendGroups, participantEvents] = await Promise.all([
		db.feedback.aggregate({
			where: filter,
			_count: { _all: true },
			_avg: { overallScore: true },
		}),
		db.feedback.groupBy({
			by: ["recommend"],
			where: { ...filter, recommend: { not: null } },
			_count: { _all: true },
		}),
		query.role === "MENTOR"
			? Promise.resolve([])
			: db.feedback.groupBy({
					by: ["eventId"],
					where: { ...filter, role: "PARTICIPANT" },
					_count: { _all: true },
				}),
	]);

	const answered = recommendGroups.reduce((n, g) => n + g._count._all, 0);
	const yes =
		recommendGroups.find((g) => g.recommend === "yes")?._count._all ?? 0;

	// A kitöltési arányt csak a szövegkereséstől független halmazon értelmezzük.
	let responseRate: number | null = null;
	if (!query.q && participantEvents.length > 0) {
		// Az anonimizált résztvevők is a nevezőbe számítanak.
		const attended = await db.application.count({
			where: {
				status: "ATTENDED",
				eventId: { in: participantEvents.map((g) => g.eventId) },
			},
		});
		const responses = participantEvents.reduce(
			(n, g) => n + g._count._all,
			0,
		);
		responseRate = attended > 0 ? responses / attended : null;
	}

	return {
		count: aggregate._count._all,
		averageScore: aggregate._avg.overallScore,
		recommendRate: answered > 0 ? yes / answered : null,
		responseRate,
	};
}

export async function listFeedback(
	query: FeedbackQuery,
): Promise<FeedbackListPage> {
	const filter = where(query);
	const total = await db.feedback.count({ where: filter });
	const pageCount = Math.max(1, Math.ceil(total / FEEDBACK_PAGE_SIZE));
	const page = Math.min(query.page, pageCount);
	const [rows, summary] = await Promise.all([
		db.feedback.findMany({
			where: filter,
			select: itemSelect,
			orderBy: [
				{ submittedAt: { sort: "desc", nulls: "last" } },
				{ id: "asc" },
			],
			skip: (page - 1) * FEEDBACK_PAGE_SIZE,
			take: FEEDBACK_PAGE_SIZE,
		}),
		stats(query),
	]);
	return {
		items: rows.map(toItem),
		total,
		page,
		pageSize: FEEDBACK_PAGE_SIZE,
		stats: summary,
	};
}

/** Egy visszajelzés a részletek fiókhoz; `null`, ha nincs ilyen. */
export const getFeedback = cache(
	async (id: string): Promise<FeedbackListItem | null> => {
		const row = await db.feedback.findUnique({
			where: { id },
			select: itemSelect,
		});
		return row ? toItem(row) : null;
	},
);

/** Programok a szűrőhöz: amelyekhez van visszajelzés, a legfrissebb elöl. */
export async function feedbackEventOptions(): Promise<
	{ id: string; name: string }[]
> {
	return db.event.findMany({
		where: { feedbacks: { some: {} } },
		select: { id: true, name: true },
		orderBy: { from: "desc" },
	});
}

/** Az utolsó importált visszajelzés ideje (a fejléc „utolsó szinkron” sorához). */
export async function lastFeedbackImport(
	eventId?: string,
): Promise<Date | null> {
	const row = await db.feedback.findFirst({
		where: eventId ? { eventId } : {},
		select: { createdAt: true },
		orderBy: { createdAt: "desc" },
	});
	return row?.createdAt ?? null;
}
