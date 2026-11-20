import { z } from "zod";

/**
 * Böngészőben mentett oszlopbeállítás (sorrend + rejtett oszlopok) egy
 * listához. A lista-specifikus konfiguráció: pl. `lib/applicants/column-settings.ts`,
 * `lib/events/column-settings.ts`.
 */
export type ColumnSettings<Id extends string = string> = {
	order: Id[];
	hidden: Id[];
};

export type ColumnSettingsConfig<Id extends string = string> = {
	/** Az összes oszlop, alapértelmezett sorrendben. */
	ids: readonly Id[];
	/** Mindig látszik, nem rejthető el. */
	locked: Id;
	defaultHidden: readonly Id[];
	/** localStorage kulcs. */
	storageKey: string;
};

export function defaultColumnSettings<Id extends string>(
	config: ColumnSettingsConfig<Id>,
): ColumnSettings<Id> {
	return { order: [...config.ids], hidden: [...config.defaultHidden] };
}

const storedSchema = z.object({
	order: z.array(z.unknown()),
	hidden: z.array(z.unknown()),
});

/**
 * Bármilyen (akár sérült) tárolt értékből érvényes beállítást készít:
 * ismeretlen id-k kimaradnak, a hiányzók az alapértelmezett helyükre
 * kerülnek, a zárolt oszlop sosem rejtett.
 */
export function normalizeColumnSettings<Id extends string>(
	config: ColumnSettingsConfig<Id>,
	raw: unknown,
): ColumnSettings<Id> {
	const parsed = storedSchema.safeParse(raw);
	if (!parsed.success) return defaultColumnSettings(config);

	const isId = (value: unknown): value is Id =>
		typeof value === "string" &&
		(config.ids as readonly string[]).includes(value);

	const order = [...new Set(parsed.data.order.filter(isId))];
	for (const [index, id] of config.ids.entries()) {
		if (order.includes(id)) continue;
		// Insert after the nearest preceding default column that is present.
		const before = config.ids
			.slice(0, index)
			.reverse()
			.find((prev) => order.includes(prev));
		order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
	}

	const hidden = [...new Set(parsed.data.hidden.filter(isId))].filter(
		(id) => id !== config.locked,
	);
	return { order, hidden };
}

export function visibleColumns<Id extends string>(
	settings: ColumnSettings<Id>,
): Id[] {
	return settings.order.filter((id) => !settings.hidden.includes(id));
}

export function loadColumnSettings<Id extends string>(
	config: ColumnSettingsConfig<Id>,
): ColumnSettings<Id> {
	try {
		const raw = window.localStorage.getItem(config.storageKey);
		return normalizeColumnSettings(
			config,
			raw === null ? null : JSON.parse(raw),
		);
	} catch {
		return defaultColumnSettings(config);
	}
}

export function saveColumnSettings<Id extends string>(
	config: ColumnSettingsConfig<Id>,
	settings: ColumnSettings<Id>,
): void {
	try {
		window.localStorage.setItem(
			config.storageKey,
			JSON.stringify(settings),
		);
	} catch {
		// Storage unavailable (private mode, quota): settings last for the visit.
	}
}

export function setColumnVisible<Id extends string>(
	config: Pick<ColumnSettingsConfig<Id>, "locked">,
	settings: ColumnSettings<Id>,
	id: Id,
	visible: boolean,
): ColumnSettings<Id> {
	if (id === config.locked) return settings;
	const hidden = settings.hidden.filter((h) => h !== id);
	return { ...settings, hidden: visible ? hidden : [...hidden, id] };
}

/** Oszlop áthelyezése a `to` indexre (húzás vagy fel/le gomb). */
export function moveColumn<Id extends string>(
	settings: ColumnSettings<Id>,
	id: Id,
	to: number,
): ColumnSettings<Id> {
	const order = settings.order.filter((c) => c !== id);
	const target = Math.max(0, Math.min(to, order.length));
	order.splice(target, 0, id);
	return { ...settings, order };
}
