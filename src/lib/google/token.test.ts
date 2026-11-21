// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findAccount, updateAccount } = vi.hoisted(() => ({
	findAccount: vi.fn(),
	updateAccount: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: { account: { findFirst: findAccount, update: updateAccount } },
}));
vi.mock("@/lib/env", () => ({
	env: { GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "secret" },
}));

import {
	getGoogleAccessToken,
	GOOGLE_SHEETS_SCOPE,
	GoogleReauthRequiredError,
} from "./token";

const NOW = 1_750_000_000;
const account = (overrides: Record<string, unknown> = {}) => ({
	id: "acc1",
	scope: `openid email ${GOOGLE_SHEETS_SCOPE}`,
	access_token: "old-token",
	expires_at: NOW + 3600,
	refresh_token: "refresh",
	...overrides,
});

describe("getGoogleAccessToken", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
	});
	afterEach(() => vi.restoreAllMocks());

	it("returns the stored token while it is valid", async () => {
		findAccount.mockResolvedValue(account());
		const fetch = vi.spyOn(globalThis, "fetch");
		await expect(getGoogleAccessToken("u1")).resolves.toBe("old-token");
		expect(findAccount).toHaveBeenCalledWith({
			where: { userId: "u1", provider: "google" },
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("asks to sign in again without a Google account", async () => {
		findAccount.mockResolvedValue(null);
		await expect(getGoogleAccessToken("u1")).rejects.toBeInstanceOf(
			GoogleReauthRequiredError,
		);
	});

	it("asks to sign in again when the Sheets scope is missing", async () => {
		findAccount.mockResolvedValue(account({ scope: "openid email" }));
		const fetch = vi.spyOn(globalThis, "fetch");
		await expect(getGoogleAccessToken("u1")).rejects.toBeInstanceOf(
			GoogleReauthRequiredError,
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("refreshes an expiring token and stores the new one", async () => {
		findAccount.mockResolvedValue(account({ expires_at: NOW + 30 }));
		const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					access_token: "new-token",
					expires_in: 3599,
				}),
				{ status: 200 },
			),
		);
		await expect(getGoogleAccessToken("u1")).resolves.toBe("new-token");
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("https://oauth2.googleapis.com/token");
		const body = new URLSearchParams(String(init?.body));
		expect(body.get("grant_type")).toBe("refresh_token");
		expect(body.get("refresh_token")).toBe("refresh");
		expect(updateAccount).toHaveBeenCalledWith({
			where: { id: "acc1" },
			data: { access_token: "new-token", expires_at: NOW + 3599 },
		});
	});

	it("asks to sign in again without a refresh token", async () => {
		findAccount.mockResolvedValue(
			account({ expires_at: NOW - 10, refresh_token: null }),
		);
		await expect(getGoogleAccessToken("u1")).rejects.toBeInstanceOf(
			GoogleReauthRequiredError,
		);
	});

	it("asks to sign in again when Google rejects the refresh", async () => {
		findAccount.mockResolvedValue(account({ expires_at: NOW - 10 }));
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "invalid_grant" }), {
				status: 400,
			}),
		);
		await expect(getGoogleAccessToken("u1")).rejects.toBeInstanceOf(
			GoogleReauthRequiredError,
		);
		expect(updateAccount).not.toHaveBeenCalled();
	});
});
