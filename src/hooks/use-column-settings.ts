"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
	COLUMN_SETTINGS_KEY,
	DEFAULT_COLUMN_SETTINGS,
	normalizeColumnSettings,
	saveColumnSettings,
	type ColumnSettings,
} from "@/lib/applicants/column-settings";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	// Other tabs of the same browser.
	const onStorage = (e: StorageEvent) => {
		if (e.key === COLUMN_SETTINGS_KEY) listener();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
	};
}

// Only used when the browser blocks storage: settings then last for the visit.
let memoryRaw: string | null = null;

function getSnapshot(): string | null {
	try {
		return window.localStorage.getItem(COLUMN_SETTINGS_KEY);
	} catch {
		return memoryRaw;
	}
}

/**
 * Oszlopbeállítás a böngészőben. A szerver-render az alapértelmezést
 * használja, a kliens a mentett (normalizált) értéket.
 */
export function useColumnSettings() {
	const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

	const settings = useMemo<ColumnSettings>(() => {
		if (raw === null) return DEFAULT_COLUMN_SETTINGS;
		try {
			return normalizeColumnSettings(JSON.parse(raw));
		} catch {
			return DEFAULT_COLUMN_SETTINGS;
		}
	}, [raw]);

	const update = useCallback((next: ColumnSettings) => {
		memoryRaw = JSON.stringify(next);
		saveColumnSettings(next); // no-op when storage is blocked
		for (const listener of listeners) listener();
	}, []);

	return [settings, update] as const;
}
