/**
 * Böngészőoldali hívások a saját `/api` végpontjainkra. 401 esetén a
 * felhasználót a bejelentkezésre küldi, visszatérési címként az aktuális
 * oldallal (query-vel együtt).
 */

export class ApiError extends Error {
	constructor(
		readonly status: number,
		/** A hibaválasz JSON-törzse, ha volt (pl. `{ error, details }`). */
		readonly body?: unknown,
	) {
		super(`API request failed with status ${status}`);
		this.name = "ApiError";
	}
}

function redirectToLogin() {
	const current = `${window.location.pathname}${window.location.search}`;
	// Deliberately a full navigation, not the client router: this runs outside
	// React (in fetch helpers) after the session expired, and NextAuth's login
	// page should start from a clean document.
	// eslint-disable-next-line @next/next/no-location-assign-relative-destination
	window.location.href = `/login?callbackUrl=${encodeURIComponent(current)}`;
}

export async function apiFetch<T>(
	input: string,
	init: RequestInit = {},
): Promise<T> {
	const response = await fetch(input, {
		...init,
		headers: { accept: "application/json", ...init.headers },
		credentials: "same-origin",
	});
	if (response.status === 401) {
		redirectToLogin();
		throw new ApiError(401);
	}
	if (!response.ok) {
		const body: unknown = await response.json().catch(() => undefined);
		throw new ApiError(response.status, body);
	}
	return (await response.json()) as T;
}

/** JSON-törzsű kérés beállításai az `apiFetch`-hez. */
export function jsonInit(method: string, body: unknown): RequestInit {
	return {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	};
}

/**
 * A hibaválasz `error` szövege, ha az a felhasználónak szól; egyébként (nem
 * API-hiba, nincs szöveg, vagy részletek nélküli `500`) a `fallback`.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError && error.status !== 500) {
		const message = (error.body as { error?: unknown } | undefined)?.error;
		if (typeof message === "string") return message;
	}
	return fallback;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
