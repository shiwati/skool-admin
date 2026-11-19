// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, findEvent, getToken, fetchSheet, importRows } = vi.hoisted(
	() => ({
		getSession: vi.fn(),
		findEvent: vi.fn(),
		getToken: vi.fn(),
		fetchSheet: vi.fn(),
		importRows: vi.fn(),
	}),
);
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/db", () => ({ db: { event: { findUnique: findEvent } } }));
vi.mock("@/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/google/token", async () => {
	class GoogleReauthRequiredError extends Error {}
	return { getGoogleAccessToken: getToken, GoogleReauthRequiredError };
});
vi.mock("@/lib/google/sheets", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/google/sheets")>()),
	fetchSheet,
}));
vi.mock("@/lib/sheet-import/import", async () => {
	class SheetHeaderError extends Error {
		constructor(readonly missing: string[]) {
			super("missing");
		}
	}
	return { importSheetRows: importRows, SheetHeaderError };
});

import { GoogleReauthRequiredError } from "@/lib/google/token";
import { SheetHeaderError } from "@/lib/sheet-import/import";
import { POST } from "./route";

const SHEET = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=42";
const call = () =>
	POST(new Request("http://x/api/events/e1/sync", { method: "POST" }), {
		params: Promise.resolve({ id: "e1" }),
	});

describe("POST /api/events/[id]/sync", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		findEvent.mockResolvedValue({ id: "e1", sheetUrl: SHEET });
		getToken.mockResolvedValue("token");
		fetchSheet.mockResolvedValue({ timeZone: "Europe/Budapest", rows: [] });
		importRows.mockResolvedValue({
			created: 2,
			existing: 1,
			duplicates: 0,
			errors: [],
			unmappedHeaders: [],
		});
	});

	it("rejects signed-out requests", async () => {
		getSession.mockResolvedValue(null);
		expect((await call()).status).toBe(401);
		expect(findEvent).not.toHaveBeenCalled();
	});

	it("returns 404 for unknown events", async () => {
		findEvent.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
	});

	it("requires a valid sheet URL", async () => {
		findEvent.mockResolvedValue({ id: "e1", sheetUrl: null });
		const res = await call();
		expect(res.status).toBe(422);
		expect((await res.json()).code).toBe("SHEET_URL_INVALID");
	});

	it("imports the sheet tab from the URL as the signed-in admin", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ created: 2, existing: 1 });
		expect(getToken).toHaveBeenCalledWith("u1");
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "abc123", gid: 42 },
			"token",
		);
		expect(importRows).toHaveBeenCalledWith({
			eventId: "e1",
			rows: [],
			timeZone: "Europe/Budapest",
			userId: "u1",
		});
	});

	it("asks for re-authentication when Google access is missing", async () => {
		getToken.mockRejectedValue(new GoogleReauthRequiredError());
		const res = await call();
		expect(res.status).toBe(403);
		expect((await res.json()).code).toBe("REAUTH_REQUIRED");
	});

	it("reports missing required columns", async () => {
		importRows.mockRejectedValue(new SheetHeaderError(["email"]));
		const res = await call();
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ missing: ["email"] });
	});
});
