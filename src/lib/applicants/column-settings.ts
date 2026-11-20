import * as core from "@/lib/column-settings";

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

export type ColumnSettings = core.ColumnSettings<ColumnId>;

export const COLUMN_SETTINGS_KEY = "skool-admin:applicants:columns:v1";

export const APPLICANT_COLUMN_CONFIG: core.ColumnSettingsConfig<ColumnId> = {
	ids: COLUMN_IDS,
	locked: LOCKED_COLUMN,
	defaultHidden: DEFAULT_HIDDEN,
	storageKey: COLUMN_SETTINGS_KEY,
};

export const DEFAULT_COLUMN_SETTINGS: ColumnSettings =
	core.defaultColumnSettings(APPLICANT_COLUMN_CONFIG);

export const normalizeColumnSettings = (raw: unknown): ColumnSettings =>
	core.normalizeColumnSettings(APPLICANT_COLUMN_CONFIG, raw);

export const visibleColumns = core.visibleColumns<ColumnId>;

export const loadColumnSettings = (): ColumnSettings =>
	core.loadColumnSettings(APPLICANT_COLUMN_CONFIG);

export const saveColumnSettings = (settings: ColumnSettings): void =>
	core.saveColumnSettings(APPLICANT_COLUMN_CONFIG, settings);

export const setColumnVisible = (
	settings: ColumnSettings,
	id: ColumnId,
	visible: boolean,
): ColumnSettings =>
	core.setColumnVisible(APPLICANT_COLUMN_CONFIG, settings, id, visible);

export const moveColumn = core.moveColumn<ColumnId>;
