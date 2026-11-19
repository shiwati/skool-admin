/** A változásnapló napok szerinti csoportosítása (kliensről is importálható). */

const TIME_ZONE = "Europe/Budapest";

const dayKey = new Intl.DateTimeFormat("en-CA", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const dayLabel = new Intl.DateTimeFormat("hu-HU", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "long",
	day: "numeric",
});

const time = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

/** `ÓÓ:PP` budapesti idő szerint. */
export function formatTime(date: Date): string {
	return time.format(date);
}

/** „Ma”, „Tegnap”, egyébként pl. „2026. november 3.” (budapesti nap szerint). */
export function formatDayLabel(date: Date, now: Date): string {
	const key = dayKey.format(date);
	if (key === dayKey.format(now)) return "Ma";
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	if (key === dayKey.format(yesterday)) return "Tegnap";
	return dayLabel.format(date);
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
		const key = dayKey.format(item.createdAt);
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
