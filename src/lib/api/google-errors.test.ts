// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/google/token", () => {
	class GoogleReauthRequiredError extends Error {}
	return { GoogleReauthRequiredError };
});

import { SheetAccessError } from "@/lib/google/sheets";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { googleErrorResponse, SHEET_REAUTH_MESSAGE } from "./google-errors";

describe("googleErrorResponse", () => {
	it("asks for a new Google sign-in", async () => {
		const res = googleErrorResponse(new GoogleReauthRequiredError());
		expect(res?.status).toBe(403);
		expect(await res?.json()).toEqual({
			error: SHEET_REAUTH_MESSAGE,
			code: "REAUTH_REQUIRED",
		});
	});

	it("uses the given re-auth message", async () => {
		const res = googleErrorResponse(new GoogleReauthRequiredError(), "Más");
		expect((await res?.json()).error).toBe("Más");
	});

	it("passes on the sheet access message", async () => {
		const res = googleErrorResponse(
			new SheetAccessError("Nem érhető el.", 403),
		);
		expect(res?.status).toBe(422);
		expect(await res?.json()).toEqual({
			error: "Nem érhető el.",
			code: "SHEET_NOT_ACCESSIBLE",
		});
	});

	it("ignores other errors", () => {
		expect(googleErrorResponse(new Error("x"))).toBeUndefined();
	});
});
