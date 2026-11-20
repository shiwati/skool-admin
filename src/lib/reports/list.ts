import "server-only";
import { db } from "@/lib/db";

export const REPORT_TABS = ["todo", "done", "all"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export function parseReportTab(value: unknown): ReportTab {
	return REPORT_TABS.includes(value as ReportTab)
		? (value as ReportTab)
		: "todo";
}

export type ReportListItem = {
	eventId: string;
	name: string;
	companyName: string | null;
	to: Date;
	documents: number;
	lastGeneratedAt: Date | null;
	lastGeneratedBy: string | null;
};

/** Lezárt programok (a befejezés a múltban van), a legutóbb lezárt elöl. */
export async function listReports(now: Date): Promise<{
	items: ReportListItem[];
	counts: Record<ReportTab, number>;
}> {
	const events = await db.event.findMany({
		where: { to: { lt: now } },
		orderBy: [{ to: "desc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			companyName: true,
			to: true,
			_count: { select: { reportDocuments: true } },
			reportDocuments: {
				orderBy: { createdAt: "desc" },
				take: 1,
				select: {
					createdAt: true,
					createdBy: { select: { name: true } },
				},
			},
		},
	});
	const items = events.map((e) => ({
		eventId: e.id,
		name: e.name,
		companyName: e.companyName,
		to: e.to,
		documents: e._count.reportDocuments,
		lastGeneratedAt: e.reportDocuments[0]?.createdAt ?? null,
		lastGeneratedBy: e.reportDocuments[0]?.createdBy?.name ?? null,
	}));
	const done = items.filter((i) => i.documents > 0).length;
	return {
		items,
		counts: { todo: items.length - done, done, all: items.length },
	};
}

export function filterReports(
	items: ReportListItem[],
	tab: ReportTab,
): ReportListItem[] {
	if (tab === "all") return items;
	return items.filter((i) => (tab === "done") === i.documents > 0);
}
