import type { ColumnSettingsConfig } from "@/lib/column-settings";

/** A Programok tábla konfigurálható oszlopai, alapértelmezett sorrendben. */
export const EVENT_COLUMN_IDS = [
	"name",
	"date",
	"location",
	"demand",
	"people",
	"status",
] as const;
export type EventColumnId = (typeof EVENT_COLUMN_IDS)[number];

export const EVENT_COLUMN_CONFIG: ColumnSettingsConfig<EventColumnId> = {
	ids: EVENT_COLUMN_IDS,
	// The program name links to the program; it always stays visible.
	locked: "name",
	defaultHidden: [],
	storageKey: "skool-admin:events:columns:v1",
};
