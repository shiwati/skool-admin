"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
	defaultColumnSettings,
	normalizeColumnSettings,
	saveColumnSettings,
	type ColumnSettings,
	type ColumnSettingsConfig,
} from "@/lib/column-settings";

/** Subscribers per storage key (one list per table). */
const listeners = new Map<string, Set<() => void>>();
// Only used when the browser blocks storage: settings then last for the visit.
const memoryRaw = new Map<string, string>();

function listenersFor(key: string) {
	let set = listeners.get(key);
	if (!set) {
		set = new Set();
		listeners.set(key, set);
	}
	return set;
}

/**
 * Oszlopbeállítás a böngészőben, listánként (`config.storageKey`). A
 * szerver-render az alapértelmezést használja, a kliens a mentett
 * (normalizált) értéket. A `config` legyen modul szintű konstans.
 */
export function useColumnSettings<Id extends string>(
	config: ColumnSettingsConfig<Id>,
) {
	const key = config.storageKey;

	const subscribe = useCallback(
		(listener: () => void) => {
			const set = listenersFor(key);
			set.add(listener);
			// Other tabs of the same browser.
			const onStorage = (e: StorageEvent) => {
				if (e.key === key) listener();
			};
			window.addEventListener("storage", onStorage);
			return () => {
				set.delete(listener);
				window.removeEventListener("storage", onStorage);
			};
		},
		[key],
	);

	const getSnapshot = useCallback((): string | null => {
		try {
			return window.localStorage.getItem(key);
		} catch {
			return memoryRaw.get(key) ?? null;
		}
	}, [key]);

	const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

	const defaults = useMemo(() => defaultColumnSettings(config), [config]);

	const settings = useMemo<ColumnSettings<Id>>(() => {
		if (raw === null) return defaults;
		try {
			return normalizeColumnSettings(config, JSON.parse(raw));
		} catch {
			return defaults;
		}
	}, [raw, config, defaults]);

	const update = useCallback(
		(next: ColumnSettings<Id>) => {
			memoryRaw.set(key, JSON.stringify(next));
			saveColumnSettings(config, next); // no-op when storage is blocked
			for (const listener of listenersFor(key)) listener();
		},
		[key, config],
	);

	return [settings, update] as const;
}
