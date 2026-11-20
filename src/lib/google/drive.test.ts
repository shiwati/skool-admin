// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./token", () => {
	class GoogleReauthRequiredError extends Error {}
	return { GoogleReauthRequiredError };
});

import {
	copyDriveFile,
	DocsApiDisabledError,
	getDocument,
	ReportTemplateNotAccessibleError,
} from "./docs";
import { DriveApiDisabledError } from "./drive";
import { GoogleReauthRequiredError } from "./token";

const respond = (status: number, body: unknown) =>
	vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(new Response(JSON.stringify(body), { status }));

const copy = () => copyDriveFile("template-id", "Riport", "token");

describe("copyDriveFile", () => {
	afterEach(() => vi.restoreAllMocks());

	it("returns the copy's id and link", async () => {
		const fetch = respond(200, {
			id: "abc",
			webViewLink: "https://docs.google.com/x",
		});
		await expect(copy()).resolves.toEqual({
			id: "abc",
			url: "https://docs.google.com/x",
		});
		expect(String(fetch.mock.calls[0][0])).toContain(
			"/drive/v3/files/template-id/copy",
		);
	});

	it("asks to sign in again on a missing scope", async () => {
		respond(403, {
			error: {
				status: "PERMISSION_DENIED",
				errors: [{ reason: "insufficientPermissions" }],
			},
		});
		await expect(copy()).rejects.toBeInstanceOf(GoogleReauthRequiredError);
	});

	it("reports a disabled Drive API", async () => {
		respond(403, {
			error: {
				status: "PERMISSION_DENIED",
				errors: [{ reason: "accessNotConfigured" }],
				details: [{ reason: "SERVICE_DISABLED" }],
			},
		});
		await expect(copy()).rejects.toBeInstanceOf(DriveApiDisabledError);
	});

	it("reports a template the admin cannot see", async () => {
		respond(404, { error: { errors: [{ reason: "notFound" }] } });
		await expect(copy()).rejects.toBeInstanceOf(
			ReportTemplateNotAccessibleError,
		);
	});

	it("keeps Google's reason in other errors", async () => {
		respond(500, { error: { errors: [{ reason: "backendError" }] } });
		await expect(copy()).rejects.toThrow(
			"Google Drive API error (500: backendError)",
		);
	});
});

describe("getDocument", () => {
	afterEach(() => vi.restoreAllMocks());

	it("reports a disabled Docs API", async () => {
		respond(403, {
			error: { errors: [{ reason: "accessNotConfigured" }] },
		});
		await expect(getDocument("doc", "token")).rejects.toBeInstanceOf(
			DocsApiDisabledError,
		);
	});
});
