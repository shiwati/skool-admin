// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./token", () => {
	class GoogleReauthRequiredError extends Error {}
	return { GoogleReauthRequiredError };
});

import { createGoogleDocFromHtml, DriveApiDisabledError } from "./drive";
import { GoogleReauthRequiredError } from "./token";

const respond = (status: number, body: unknown) =>
	vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(new Response(JSON.stringify(body), { status }));

const create = () => createGoogleDocFromHtml("Riport", "<p>x</p>", "token");

describe("createGoogleDocFromHtml", () => {
	afterEach(() => vi.restoreAllMocks());

	it("returns the new doc's id and link", async () => {
		respond(200, { id: "abc", webViewLink: "https://docs.google.com/x" });
		await expect(create()).resolves.toEqual({
			id: "abc",
			url: "https://docs.google.com/x",
		});
	});

	it("asks to sign in again on a missing scope", async () => {
		respond(403, {
			error: {
				status: "PERMISSION_DENIED",
				errors: [{ reason: "insufficientPermissions" }],
			},
		});
		await expect(create()).rejects.toBeInstanceOf(
			GoogleReauthRequiredError,
		);
	});

	it("reports a disabled Drive API", async () => {
		respond(403, {
			error: {
				status: "PERMISSION_DENIED",
				errors: [{ reason: "accessNotConfigured" }],
				details: [{ reason: "SERVICE_DISABLED" }],
			},
		});
		await expect(create()).rejects.toBeInstanceOf(DriveApiDisabledError);
	});

	it("keeps Google's reason in other errors", async () => {
		respond(403, {
			error: { errors: [{ reason: "storageQuotaExceeded" }] },
		});
		await expect(create()).rejects.toThrow(
			"Google Drive API error (403: storageQuotaExceeded)",
		);
	});
});
