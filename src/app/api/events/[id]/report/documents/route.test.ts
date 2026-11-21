// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, generate } = vi.hoisted(() => ({
	getSession: vi.fn(),
	generate: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/google/token", () => {
	class GoogleReauthRequiredError extends Error {}
	return { GoogleReauthRequiredError };
});
vi.mock("@/lib/reports/save", () => {
	class ReportEventNotFoundError extends Error {}
	return { generateReportDocument: generate, ReportEventNotFoundError };
});

import {
	DocsApiDisabledError,
	ReportTemplateNotAccessibleError,
} from "@/lib/google/docs";
import { DriveApiDisabledError } from "@/lib/google/drive";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { ReportEventNotFoundError } from "@/lib/reports/save";
import { POST } from "./route";

const content = {
	people: [{ role: "Oktató", organization: "Skool", name: "Anna" }],
	quotes: [],
	disabledMetrics: [],
};
const call = (body: unknown) =>
	POST(
		new Request("http://x/api/events/e1/report/documents", {
			method: "POST",
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id: "e1" }) },
	);

describe("POST /api/events/[id]/report/documents", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("rejects a request without an admin session", async () => {
		getSession.mockResolvedValue(null);
		const response = await call({ content });
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
		expect(generate).not.toHaveBeenCalled();
	});

	it("validates the content", async () => {
		const response = await call({ content: { ...content, people: "x" } });
		expect(response.status).toBe(400);
		expect(generate).not.toHaveBeenCalled();
	});

	it("generates a new doc and returns its link", async () => {
		generate.mockResolvedValue({
			id: "d1",
			title: "Riport",
			docUrl: "https://docs.google.com/document/d/abc/edit",
			createdAt: new Date("2026-11-20T10:00:00Z"),
		});
		const response = await call({ content });
		expect(response.status).toBe(201);
		expect(generate).toHaveBeenCalledWith("e1", content, "u1");
		expect(await response.json()).toEqual({
			id: "d1",
			title: "Riport",
			docUrl: "https://docs.google.com/document/d/abc/edit",
			createdAt: "2026-11-20T10:00:00.000Z",
		});
	});

	it("asks to sign in again when the Drive scope is missing", async () => {
		generate.mockRejectedValue(new GoogleReauthRequiredError());
		const response = await call({ content });
		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			code: "REAUTH_REQUIRED",
		});
	});

	it("returns 404 for an unknown event", async () => {
		generate.mockRejectedValue(new ReportEventNotFoundError());
		expect((await call({ content })).status).toBe(404);
	});

	it("rejects a body that is not JSON", async () => {
		expect((await call("{")).status).toBe(400);
		expect(generate).not.toHaveBeenCalled();
	});

	it("returns 422 when the template is not accessible", async () => {
		generate.mockRejectedValue(new ReportTemplateNotAccessibleError());
		const response = await call({ content });
		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			code: "TEMPLATE_NOT_ACCESSIBLE",
			error: "A riport-sablon nem érhető el. Ellenőrizd, hogy meg van-e osztva a domainnel.",
		});
	});

	it("returns 503 when the Drive API is disabled", async () => {
		generate.mockRejectedValue(new DriveApiDisabledError());
		const response = await call({ content });
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			code: "DRIVE_API_DISABLED",
		});
	});

	it("returns 503 when the Docs API is disabled", async () => {
		generate.mockRejectedValue(new DocsApiDisabledError());
		const response = await call({ content });
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			code: "DOCS_API_DISABLED",
		});
	});

	it("returns 502 when Google fails", async () => {
		generate.mockRejectedValue(new Error("Google Drive API error (500)"));
		const response = await call({ content });
		expect(response.status).toBe(502);
		expect(JSON.stringify(await response.json())).not.toContain(
			"Google Drive API error",
		);
	});
});
