/**
 * Böngészőoldali hívások a saját `/api` végpontjainkra. 401 esetén a
 * felhasználót a bejelentkezésre küldi, visszatérési címként az aktuális
 * oldallal (query-vel együtt).
 */

export class ApiError extends Error {
	constructor(readonly status: number) {
		super(`API request failed with status ${status}`);
		this.name = "ApiError";
	}
}

export function redirectToLogin() {
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
	if (!response.ok) throw new ApiError(response.status);
	return (await response.json()) as T;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
