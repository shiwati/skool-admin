import { z } from "zod";

/** A Jelentkezők tábla konfigurálható oszlopai, alapértelmezett sorrendben. */
export const COLUMN_IDS = [
	"name",
	"age",
	"program",
	"status",
	"location",
	"newsletter",
	"history",
	"createdAt",
	"parent",
	"phone",
] as const;
export type ColumnId = (typeof COLUMN_IDS)[number];

/** Mindig látszik, nem rejthető el. */
export const LOCKED_COLUMN: ColumnId = "name";
export const DEFAULT_HIDDEN: readonly ColumnId[] = ["parent", "phone"];

export type ColumnSettings = { order: ColumnId[]; hidden: ColumnId[] };

export const DEFAULT_COLUMN_SETTINGS: ColumnSettings = {
	order: [...COLUMN_IDS],
	hidden: [...DEFAULT_HIDDEN],
};

export const COLUMN_SETTINGS_KEY = "skool-admin:applicants:columns:v1";

const isColumnId = (value: unknown): value is ColumnId =>
	typeof value === "string" &&
	(COLUMN_IDS as readonly string[]).includes(value);

const storedSchema = z.object({
	order: z.array(z.unknown()),
	hidden: z.array(z.unknown()),
});

/**
 * Bármilyen (akár sérült) tárolt értékből érvényes beállítást készít:
 * ismeretlen id-k kimaradnak, a hiányzók az alapértelmezett helyükre
 * kerülnek, a "Név / e-mail" sosem rejtett.
 */
export function normalizeColumnSettings(raw: unknown): ColumnSettings {
	const parsed = storedSchema.safeParse(raw);
	if (!parsed.success) return structuredClone(DEFAULT_COLUMN_SETTINGS);

	const order = [...new Set(parsed.data.order.filter(isColumnId))];
	for (const [index, id] of COLUMN_IDS.entries()) {
		if (order.includes(id)) continue;
		// Insert after the nearest preceding default column that is present.
		const before = COLUMN_IDS.slice(0, index)
			.reverse()
			.find((prev) => order.includes(prev));
		order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
	}

	const hidden = [...new Set(parsed.data.hidden.filter(isColumnId))].filter(
		(id) => id !== LOCKED_COLUMN,
	);
	return { order, hidden };
}

export function visibleColumns(settings: ColumnSettings): ColumnId[] {
	return settings.order.filter((id) => !settings.hidden.includes(id));
}

export function loadColumnSettings(): ColumnSettings {
	try {
		const raw = window.localStorage.getItem(COLUMN_SETTINGS_KEY);
		return normalizeColumnSettings(raw === null ? null : JSON.parse(raw));
	} catch {
		return structuredClone(DEFAULT_COLUMN_SETTINGS);
	}
}

export function saveColumnSettings(settings: ColumnSettings): void {
	try {
		window.localStorage.setItem(
			COLUMN_SETTINGS_KEY,
			JSON.stringify(settings),
		);
	} catch {
		// Storage unavailable (private mode, quota): settings last for the visit.
	}
}

export function setColumnVisible(
	settings: ColumnSettings,
	id: ColumnId,
	visible: boolean,
): ColumnSettings {
	if (id === LOCKED_COLUMN) return settings;
	const hidden = settings.hidden.filter((h) => h !== id);
	return { ...settings, hidden: visible ? hidden : [...hidden, id] };
}

/** Oszlop áthelyezése a `to` indexre (húzás vagy fel/le gomb). */
export function moveColumn(
	settings: ColumnSettings,
	id: ColumnId,
	to: number,
): ColumnSettings {
	const order = settings.order.filter((c) => c !== id);
	const target = Math.max(0, Math.min(to, order.length));
	order.splice(target, 0, id);
	return { ...settings, order };
}
