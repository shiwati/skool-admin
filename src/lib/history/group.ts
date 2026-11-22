/** A változásnapló napok szerinti csoportosítása (kliensről is importálható). */

import { budapestDayKey, formatLongDate } from "@/lib/format";

/** „Ma”, „Tegnap”, egyébként pl. „2026. november 3.” (budapesti nap szerint). */
export function formatDayLabel(date: Date, now: Date): string {
	const key = budapestDayKey(date);
	if (key === budapestDayKey(now)) return "Ma";
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	if (key === budapestDayKey(yesterday)) return "Tegnap";
	return formatLongDate(date);
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

/**
 * Egymást követő, azonos (budapesti) napra eső elemek csoportjai, a bemenet
 * sorrendjében. A bemenet időrendben rendezett (legfrissebb elöl).
 */
export function groupByDay<T extends { createdAt: Date }>(
	items: T[],
	now: Date,
): DayGroup<T>[] {
	const groups: DayGroup<T>[] = [];
	for (const item of items) {
		const key = budapestDayKey(item.createdAt);
		const last = groups.at(-1);
		if (last?.key === key) last.items.push(item);
		else
			groups.push({
				key,
				label: formatDayLabel(item.createdAt, now),
				items: [item],
			});
	}
	return groups;
}
