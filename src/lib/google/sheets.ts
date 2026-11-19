import "server-only";
import type { SheetRef } from "./sheet-url";
import { GoogleReauthRequiredError } from "./token";

export class SheetAccessError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "SheetAccessError";
	}
}

export type SheetCell = string | number | boolean | null;

export type SheetData = {
	timeZone: string;
	rows: SheetCell[][];
};

const API = "https://sheets.googleapis.com/v4/spreadsheets";

async function call<T>(url: string, accessToken: string): Promise<T> {
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (response.status === 401) throw new GoogleReauthRequiredError();
	if (response.status === 403 || response.status === 404) {
		throw new SheetAccessError(
			"A sheet nem található, vagy nincs hozzá hozzáférésed.",
			response.status,
		);
	}
	if (!response.ok) {
		throw new Error(`Google Sheets API error (${response.status})`);
	}
	return (await response.json()) as T;
}

/**
 * Reads the tab given by the URL's gid (the first tab by default). Values are
 * unformatted, with date-times as serial numbers in the sheet's time zone.
 */
export async function fetchSheet(
	ref: SheetRef,
	accessToken: string,
): Promise<SheetData> {
	const meta = await call<{
		properties: { timeZone: string };
		sheets: { properties: { sheetId: number; title: string } }[];
	}>(
		`${API}/${ref.spreadsheetId}?fields=properties.timeZone,sheets.properties(sheetId,title)`,
		accessToken,
	);
	const tab =
		ref.gid === null
			? meta.sheets[0]
			: meta.sheets.find((s) => s.properties.sheetId === ref.gid);
	if (!tab) {
		throw new SheetAccessError("A megadott munkalap nem található.", 404);
	}

	const range = encodeURIComponent(
		`'${tab.properties.title.replaceAll("'", "''")}'`,
	);
	const values = await call<{ values?: SheetCell[][] }>(
		`${API}/${ref.spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
		accessToken,
	);
	return { timeZone: meta.properties.timeZone, rows: values.values ?? [] };
}
