// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getToken, fetchSheet, logError } = vi.hoisted(() => ({
	getSession: vi.fn(),
	getToken: vi.fn(),
	fetchSheet: vi.fn(),
	logError: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: logError } }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/google/token", async () => {
	class GoogleReauthRequiredError extends Error {}
	return { getGoogleAccessToken: getToken, GoogleReauthRequiredError };
});
vi.mock("@/lib/google/sheets", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/google/sheets")>()),
	fetchSheet,
}));

import { SheetAccessError } from "@/lib/google/sheets";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { POST } from "./route";

const SHEET = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=42";
const call = (body: unknown) =>
	POST(
		new Request("http://x/api/sheets/headers", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
	);

const SHEET_URL_INVALID = {
	error: "Adj meg egy érvényes Google Sheets linket.",
	code: "SHEET_URL_INVALID",
};

describe("POST /api/sheets/headers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		getToken.mockResolvedValue("token");
		fetchSheet.mockResolvedValue({
			timeZone: "Europe/Budapest",
			rows: [[" Időbélyeg ", "", "Vezetéknév", null, 2025]],
		});
	});

	it("rejects signed-out requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call({ url: SHEET });
		expect(res.status).toBe(401);
		expect(getToken).not.toHaveBeenCalled();
		expect(fetchSheet).not.toHaveBeenCalled();
	});

	it("returns the trimmed, non-empty header cells of the linked tab", async () => {
		const res = await call({ url: SHEET });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			headers: ["Időbélyeg", "Vezetéknév", "2025"],
		});
		expect(getToken).toHaveBeenCalledWith("u1");
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "abc123", gid: 42 },
			"token",
			{ headerOnly: true },
		);
	});

	it("reads the first worksheet when the link has no gid", async () => {
		await call({
			url: "https://docs.google.com/spreadsheets/d/abc123/edit",
		});
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "abc123", gid: null },
			"token",
			{ headerOnly: true },
		);
	});

	it("returns no headers for an empty sheet", async () => {
		fetchSheet.mockResolvedValue({ timeZone: "UTC", rows: [] });
		expect(await (await call({ url: SHEET })).json()).toEqual({
			headers: [],
		});
	});

	it("rejects a body that is not JSON", async () => {
		const res = await call("{not json");
		expect(res.status).toBe(400);
		expect(fetchSheet).not.toHaveBeenCalled();
	});

	it.each([
		["missing", {}],
		["empty", { url: "  " }],
		["too long", { url: `${SHEET}${"x".repeat(2000)}` }],
		["not a Sheets link", { url: "https://example.com/sheet" }],
	])("rejects a %s link", async (_, body) => {
		const res = await call(body);
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(SHEET_URL_INVALID);
		expect(getToken).not.toHaveBeenCalled();
	});

	it("asks for re-authentication when Google access is missing", async () => {
		getToken.mockRejectedValue(new GoogleReauthRequiredError());
		const res = await call({ url: SHEET });
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({
			error: "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.",
			code: "REAUTH_REQUIRED",
		});
	});

	it("reports sheets the admin cannot access", async () => {
		fetchSheet.mockRejectedValue(
			new SheetAccessError("A megadott munkalap nem található.", 404),
		);
		const res = await call({ url: SHEET });
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({
			error: "A megadott munkalap nem található.",
			code: "SHEET_NOT_ACCESSIBLE",
		});
	});

	it("hides unexpected failures", async () => {
		fetchSheet.mockRejectedValue(new Error("private details"));
		const res = await call({ url: SHEET });
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal Server Error" });
		expect(logError).toHaveBeenCalledOnce();
	});
});
