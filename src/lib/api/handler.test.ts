// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { getAdminSession, logError } = vi.hoisted(() => ({
	getAdminSession: vi.fn(),
	logError: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession }));
vi.mock("@/lib/logger", () => ({ logger: { error: logError } }));

import { handleQuery, jsonResponse } from "./handler";

const schema = z.object({
	q: z.string().optional(),
	pageSize: z.coerce.number().int().max(100).optional(),
});

const call = (qs: string, run = vi.fn(async () => jsonResponse({ ok: 1 }))) =>
	handleQuery(new Request(`http://x/api/things${qs}`), schema, run);

describe("handleQuery", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("answers 401 without a session and runs nothing", async () => {
		getAdminSession.mockResolvedValue(null);
		const run = vi.fn();
		const res = await call("", run);
		expect(res.status).toBe(401);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(run).not.toHaveBeenCalled();
	});

	it("answers 400 with details for invalid query parameters", async () => {
		const run = vi.fn();
		const res = await call("?pageSize=1000", run);
		expect(res.status).toBe(400);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		const body = await res.json();
		expect(body.error).toBe("Invalid query parameters");
		expect(body.details.fieldErrors).toHaveProperty("pageSize");
		expect(run).not.toHaveBeenCalled();
	});

	it("passes the parsed query to the handler", async () => {
		const run = vi.fn(async () => jsonResponse({ ok: 1 }));
		const res = await call("?q=abc&pageSize=10", run);
		expect(res.status).toBe(200);
		expect(run).toHaveBeenCalledWith({ q: "abc", pageSize: 10 });
	});

	it("answers an opaque 500 and logs no query string", async () => {
		const error = new Error("SELECT secret FROM applicant");
		const res = await call(
			"?q=kiss.peter%40example.com&pageSize=10",
			vi.fn(async () => {
				throw error;
			}),
		);
		expect(res.status).toBe(500);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ error: "Internal Server Error" });

		expect(logError).toHaveBeenCalledTimes(1);
		const [logged] = logError.mock.calls[0];
		expect(logged).toEqual({
			event: "api.request_failed",
			path: "/api/things",
			err: error,
		});
		const serialized = JSON.stringify({ ...logged, err: undefined });
		expect(serialized).not.toContain("?");
		expect(serialized).not.toContain("kiss.peter");
		expect(serialized).not.toContain("example.com");
	});
});
