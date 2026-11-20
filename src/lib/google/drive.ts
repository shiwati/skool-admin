import "server-only";
import { GoogleReauthRequiredError } from "./token";

const UPLOAD_URL =
	"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";

export type CreatedDoc = { id: string; url: string };

/** The Drive API is not enabled in the OAuth client's Google Cloud project. */
export class DriveApiDisabledError extends Error {
	constructor() {
		super("Google Drive API is not enabled");
		this.name = "DriveApiDisabledError";
	}
}

/**
 * Google's machine-readable error reasons (e.g. `accessNotConfigured`,
 * `SERVICE_DISABLED`), never the message text or the request.
 */
async function errorReason(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as {
			error?: {
				status?: string;
				errors?: { reason?: string }[];
				details?: { reason?: string }[];
			};
		};
		const reasons = [
			body.error?.status,
			...(body.error?.errors ?? []).map((e) => e.reason),
			...(body.error?.details ?? []).map((d) => d.reason),
		].filter((r): r is string => typeof r === "string" && r !== "");
		return [...new Set(reasons)].join(", ");
	} catch {
		return "";
	}
}

/**
 * Feltölti a HTML-t a bejelentkezett admin saját Drive-jába, Google Doccá
 * konvertálva (`drive.file` scope: csak az app által létrehozott fájlok).
 */
export async function createGoogleDocFromHtml(
	name: string,
	html: string,
	accessToken: string,
): Promise<CreatedDoc> {
	const boundary = `skool-${crypto.randomUUID()}`;
	const metadata = JSON.stringify({
		name,
		mimeType: "application/vnd.google-apps.document",
	});
	const body = [
		`--${boundary}`,
		"Content-Type: application/json; charset=UTF-8",
		"",
		metadata,
		`--${boundary}`,
		"Content-Type: text/html; charset=UTF-8",
		"",
		html,
		`--${boundary}--`,
		"",
	].join("\r\n");

	const response = await fetch(UPLOAD_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": `multipart/related; boundary=${boundary}`,
		},
		body,
		cache: "no-store",
	});
	if (response.status === 401) throw new GoogleReauthRequiredError();
	if (!response.ok) {
		const reason = await errorReason(response);
		// Missing scope: 403 insufficientPermissions / ACCESS_TOKEN_SCOPE_INSUFFICIENT.
		if (response.status === 403 && /insufficient/i.test(reason)) {
			throw new GoogleReauthRequiredError();
		}
		if (
			response.status === 403 &&
			/accessNotConfigured|SERVICE_DISABLED/i.test(reason)
		) {
			throw new DriveApiDisabledError();
		}
		throw new Error(
			`Google Drive API error (${response.status}${reason ? `: ${reason}` : ""})`,
		);
	}
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
