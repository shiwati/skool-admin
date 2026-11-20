import "server-only";
import { GoogleReauthRequiredError } from "./token";

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
export async function errorReason(response: Response): Promise<string> {
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
 * Közös hibakezelés a Google REST hívásokhoz: 401 vagy hiányzó scope →
 * újrabejelentkezés; kikapcsolt API → `disabled()`; egyébként a Google által
 * adott ok (`reason`) kerül a hibaüzenetbe. `other` a fennmaradó hibákat
 * képezheti le saját hibára (pl. nem elérhető sablon).
 */
export async function throwOnGoogleError(
	response: Response,
	api: string,
	disabled: () => Error,
	other?: (status: number, reason: string) => Error | null,
): Promise<void> {
	if (response.ok) return;
	if (response.status === 401) throw new GoogleReauthRequiredError();
	const reason = await errorReason(response);
	// Missing scope: 403 insufficientPermissions / ACCESS_TOKEN_SCOPE_INSUFFICIENT.
	if (response.status === 403 && /insufficient/i.test(reason)) {
		throw new GoogleReauthRequiredError();
	}
	if (
		response.status === 403 &&
		/accessNotConfigured|SERVICE_DISABLED/i.test(reason)
	) {
		throw disabled();
	}
	const mapped = other?.(response.status, reason);
	if (mapped) throw mapped;
	throw new Error(
		`Google ${api} API error (${response.status}${reason ? `: ${reason}` : ""})`,
	);
}
