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
vi.mock("@/lib/feedback/import", async () => {
	class FeedbackHeaderError extends Error {
		constructor(
			readonly role: string,
			readonly missing: string[],
		) {
			super("missing");
		}
	}
	return { importFeedbackRows: importRows, FeedbackHeaderError };
});

import { FeedbackHeaderError } from "@/lib/feedback/import";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { POST } from "./route";

const PARTICIPANT = "https://docs.google.com/spreadsheets/d/part123/edit#gid=1";
const MENTOR = "https://docs.google.com/spreadsheets/d/ment456/edit";
const call = () =>
	POST(
		new Request("http://x/api/events/e1/feedback/sync", { method: "POST" }),
		{ params: Promise.resolve({ id: "e1" }) },
	);
const RESULT = { created: 2, existing: 1, errors: [], unmappedHeaders: [] };

describe("POST /api/events/[id]/feedback/sync", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		findEvent.mockResolvedValue({
			id: "e1",
			participantFeedbackSheetUrl: PARTICIPANT,
			mentorFeedbackSheetUrl: MENTOR,
		});
		getToken.mockResolvedValue("token");
		fetchSheet.mockResolvedValue({ timeZone: "Europe/Budapest", rows: [] });
		importRows.mockResolvedValue(RESULT);
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

	it("requires at least one valid feedback sheet", async () => {
		findEvent.mockResolvedValue({
			id: "e1",
			participantFeedbackSheetUrl: null,
			mentorFeedbackSheetUrl: null,
		});
		const res = await call();
		expect(res.status).toBe(422);
		expect((await res.json()).code).toBe("SHEET_URL_INVALID");
		expect(getToken).not.toHaveBeenCalled();
	});

	it("imports both sheets with their role", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			PARTICIPANT: RESULT,
			MENTOR: RESULT,
		});
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "part123", gid: 1 },
			"token",
		);
		expect(fetchSheet).toHaveBeenCalledWith(
			{ spreadsheetId: "ment456", gid: null },
			"token",
		);
		expect(importRows).toHaveBeenCalledWith({
			eventId: "e1",
			role: "MENTOR",
			rows: [],
			timeZone: "Europe/Budapest",
		});
	});

	it("imports only the configured sheet", async () => {
		findEvent.mockResolvedValue({
			id: "e1",
			participantFeedbackSheetUrl: PARTICIPANT,
			mentorFeedbackSheetUrl: null,
		});
		const res = await call();
		expect(Object.keys(await res.json())).toEqual(["PARTICIPANT"]);
		expect(fetchSheet).toHaveBeenCalledTimes(1);
	});

	it("asks for re-authentication when Google access is missing", async () => {
		getToken.mockRejectedValue(new GoogleReauthRequiredError());
		const res = await call();
		expect(res.status).toBe(403);
		expect((await res.json()).code).toBe("REAUTH_REQUIRED");
	});

	it("reports missing required columns with the form's role", async () => {
		importRows.mockRejectedValue(
			new FeedbackHeaderError("MENTOR", ["Időbélyeg"]),
		);
		const res = await call();
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({
			code: "SHEET_HEADERS_MISSING",
			role: "MENTOR",
			missing: ["Időbélyeg"],
		});
	});
});
