export type SheetRef = { spreadsheetId: string; gid: number | null };

/** Parses a Google Sheets URL (or a bare spreadsheet id). */
export function parseSheetUrl(input: string): SheetRef | null {
	const value = input.trim();
	if (/^[\w-]{20,}$/.test(value)) return { spreadsheetId: value, gid: null };

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.hostname !== "docs.google.com") return null;
	const match = /\/spreadsheets\/d\/([\w-]+)/.exec(url.pathname);
	if (!match) return null;

	const gidText =
		url.searchParams.get("gid") ??
		new URLSearchParams(url.hash.slice(1)).get("gid");
	const gid =
		gidText !== null && /^\d+$/.test(gidText) ? Number(gidText) : null;
	return { spreadsheetId: match[1], gid };
}
