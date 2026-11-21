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

import { SheetAccessError } from "@/lib/google/sheets";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { logger } from "@/lib/logger";
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
		findEvent.mockResolvedValue({ id: "e1", applicationSheetUrl: SHEET });
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
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(findEvent).not.toHaveBeenCalled();
		expect(fetchSheet).not.toHaveBeenCalled();
	});

	it("returns 404 for unknown events", async () => {
		findEvent.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Event not found" });
	});

	it("requires a valid sheet URL", async () => {
		findEvent.mockResolvedValue({ id: "e1", applicationSheetUrl: null });
		const res = await call();
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({
			error: "Az eseményhez nincs érvényes Google Sheet link megadva.",
			code: "SHEET_URL_INVALID",
		});
		expect(fetchSheet).not.toHaveBeenCalled();
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
			headerMapping: null,
		});
	});

	it("asks for re-authentication when Google access is missing", async () => {
		getToken.mockRejectedValue(new GoogleReauthRequiredError());
		const res = await call();
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({
			error: "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
			code: "REAUTH_REQUIRED",
		});
		expect(fetchSheet).not.toHaveBeenCalled();
	});

	it("reports missing required columns", async () => {
		importRows.mockRejectedValue(new SheetHeaderError(["email"]));
		const res = await call();
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({
			error: "A sheetből hiányoznak kötelező oszlopok.",
			code: "SHEET_HEADERS_MISSING",
			missing: ["email"],
		});
	});

	it("reads the first worksheet when the link has no gid", async () => {
		findEvent.mockResolvedValue({
			id: "e1",
			applicationSheetUrl:
				"https://docs.google.com/spreadsheets/d/abc123/edit",
		});
		expect((await call()).status).toBe(200);
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "abc123", gid: null },
			"token",
		);
	});

	it("imports through a valid saved mapping and ignores an invalid one", async () => {
		const mapping = {
			lastName: "Vezetékneved",
			firstName: "Keresztneved",
			email: "Elérhetőség",
		};
		findEvent.mockResolvedValue({
			id: "e1",
			applicationSheetUrl: SHEET,
			applicationSheetMapping: mapping,
		});
		await call();
		expect(importRows.mock.calls[0][0].headerMapping).toEqual(mapping);

		findEvent.mockResolvedValue({
			id: "e1",
			applicationSheetUrl: SHEET,
			applicationSheetMapping: { lastName: "Vezetékneved" },
		});
		await call();
		expect(importRows.mock.calls[1][0].headerMapping).toBeNull();
	});

	it("reports sheets the admin cannot access", async () => {
		fetchSheet.mockRejectedValue(
			new SheetAccessError(
				"A sheet nem található, vagy nincs hozzá hozzáférésed.",
				404,
			),
		);
		const res = await call();
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({
			error: "A sheet nem található, vagy nincs hozzá hozzáférésed.",
			code: "SHEET_NOT_ACCESSIBLE",
		});
		expect(importRows).not.toHaveBeenCalled();
	});

	it("returns the result and logs only ids and counts", async () => {
		importRows.mockResolvedValue({
			created: 2,
			existing: 1,
			duplicates: 1,
			errors: [{ row: 5, reason: "Hiányzó vagy hibás e-mail cím" }],
			unmappedHeaders: ["Póló méret"],
		});
		const res = await call();
		expect(await res.json()).toEqual({
			created: 2,
			existing: 1,
			duplicates: 1,
			errors: [{ row: 5, reason: "Hiányzó vagy hibás e-mail cím" }],
			unmappedHeaders: ["Póló méret"],
		});
		expect(logger.info).toHaveBeenCalledWith({
			event: "sheet_sync.completed",
			userId: "u1",
			eventId: "e1",
			created: 2,
			existing: 1,
			duplicates: 1,
			errors: 1,
		});
	});

	it("hides unexpected failures", async () => {
		importRows.mockRejectedValue(new Error("db connection details"));
		const res = await call();
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal Server Error" });
	});
});
