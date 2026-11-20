import "server-only";
import {
	DriveApiDisabledError,
	throwOnGoogleError,
	type CreatedDoc,
} from "./drive";

/** The Docs API is not enabled in the OAuth client's Google Cloud project. */
export class DocsApiDisabledError extends Error {
	constructor() {
		super("Google Docs API is not enabled");
		this.name = "DocsApiDisabledError";
	}
}

/** A riport-sablon nem létezik, vagy az admin nem látja (nincs megosztva). */
export class ReportTemplateNotAccessibleError extends Error {
	constructor() {
		super("Report template is not accessible");
		this.name = "ReportTemplateNotAccessibleError";
	}
}

// --- A Docs API válaszának az a része, amit a kitöltés használ ------------

export type DocsTextStyle = Record<string, unknown>;

export type DocsParagraph = {
	elements?: {
		startIndex?: number;
		endIndex?: number;
		textRun?: { content?: string; textStyle?: DocsTextStyle };
	}[];
};

export type DocsTableCell = {
	startIndex?: number;
	endIndex?: number;
	content?: DocsStructuralElement[];
};

export type DocsTable = {
	tableRows?: { tableCells?: DocsTableCell[] }[];
};

export type DocsStructuralElement = {
	startIndex?: number;
	endIndex?: number;
	paragraph?: DocsParagraph;
	table?: DocsTable;
};

export type DocsDocument = {
	documentId?: string;
	body?: { content?: DocsStructuralElement[] };
};

/**
 * Lemásolja a sablont az admin saját Drive-jába. A másolatot az app hozza
 * létre, ezért `drive.file` scope-pal szerkeszthető; a sablon olvasásához
 * `drive.readonly` kell.
 */
export async function copyDriveFile(
	fileId: string,
	name: string,
	accessToken: string,
): Promise<CreatedDoc> {
	const response = await fetch(
		`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/copy?fields=id,webViewLink&supportsAllDrives=true`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json; charset=UTF-8",
			},
			body: JSON.stringify({ name }),
			cache: "no-store",
		},
	);
	await throwOnGoogleError(
		response,
		"Drive",
		() => new DriveApiDisabledError(),
		(status) =>
			status === 404 || status === 403
				? new ReportTemplateNotAccessibleError()
				: null,
	);
	const file = (await response.json()) as {
		id: string;
		webViewLink?: string;
	};
	return {
		id: file.id,
		url:
			file.webViewLink ??
			`https://docs.google.com/document/d/${file.id}/edit`,
	};
}

export async function getDocument(
	documentId: string,
	accessToken: string,
): Promise<DocsDocument> {
	const response = await fetch(
		`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
			cache: "no-store",
		},
	);
	await throwOnGoogleError(
		response,
		"Docs",
		() => new DocsApiDisabledError(),
	);
	return (await response.json()) as DocsDocument;
}

export async function batchUpdateDocument(
	documentId: string,
	requests: unknown[],
	accessToken: string,
): Promise<void> {
	if (requests.length === 0) return;
	const response = await fetch(
		`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json; charset=UTF-8",
			},
			body: JSON.stringify({ requests }),
			cache: "no-store",
		},
	);
	await throwOnGoogleError(
		response,
		"Docs",
		() => new DocsApiDisabledError(),
	);
}
