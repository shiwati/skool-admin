// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { getAdminSession, logError } = vi.hoisted(() => ({
	getAdminSession: vi.fn(),
	logError: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession }));
vi.mock("@/lib/logger", () => ({ logger: { error: logError } }));

import {
	handleAdmin,
	handleBody,
	handleQuery,
	invalidField,
	jsonResponse,
} from "./handler";

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

const post = (body: string) =>
	new Request("http://x/api/things/t1?secret=1", { method: "POST", body });

describe("handleBody", () => {
	const bodySchema = z.object({ name: z.string().min(1) });

	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("answers 401 without a user id and reads no body", async () => {
		getAdminSession.mockResolvedValue({ user: {} });
		const request = post("{}");
		const run = vi.fn();
		const res = await handleBody(request, bodySchema, run, { event: "x" });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(request.bodyUsed).toBe(false);
		expect(run).not.toHaveBeenCalled();
	});

	it("answers 400 Invalid request body for malformed JSON", async () => {
		const res = await handleBody(post("{"), bodySchema, vi.fn(), {
			event: "x",
		});
		expect(res.status).toBe(400);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ error: "Invalid request body" });
	});

	it("answers 400 with field details for an invalid body", async () => {
		const res = await handleBody(post('{"name":""}'), bodySchema, vi.fn(), {
			event: "x",
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("Invalid request body");
		expect(body.details.fieldErrors).toHaveProperty("name");
	});

	it("passes the selected, parsed body and the user id", async () => {
		const run = vi.fn(async () => jsonResponse({ ok: 1 }));
		const res = await handleBody(
			post('{"content":{"name":"A"}}'),
			bodySchema,
			run,
			{
				event: "x",
				select: (b) => (b as { content: unknown }).content,
			},
		);
		expect(res.status).toBe(200);
		expect(run).toHaveBeenCalledWith({ name: "A" }, { userId: "u1" });
	});
});

describe("handleAdmin", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
	});

	const fail = (error: unknown) =>
		vi.fn(async () => {
			throw error;
		});

	it("answers a known error through mapError without logging", async () => {
		class Gone extends Error {}
		const res = await handleAdmin(post(""), fail(new Gone()), {
			event: "thing.failed",
			mapError: (e) =>
				e instanceof Gone
					? jsonResponse({ error: "Gone" }, 410)
					: undefined,
		});
		expect(res.status).toBe(410);
		expect(logError).not.toHaveBeenCalled();
	});

	it("logs an unexpected error with its event and path, and answers 500", async () => {
		const error = new Error("boom");
		const res = await handleAdmin(post(""), fail(error), {
			event: "thing.failed",
		});
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal Server Error" });
		expect(logError).toHaveBeenCalledWith(
			{
				event: "thing.failed",
				path: "/api/things/t1",
				userId: "u1",
				err: error,
			},
			"API request failed",
		);
	});

	it("uses the failure response when given", async () => {
		const res = await handleAdmin(post(""), fail(new Error("x")), {
			event: "thing.failed",
			failure: () => jsonResponse({ error: "Később" }, 502),
		});
		expect(res.status).toBe(502);
	});
});

describe("invalidField", () => {
	it("has the same details shape as a Zod error", async () => {
		const res = invalidField("to", "Hibás");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Invalid request body",
			details: { formErrors: [], fieldErrors: { to: ["Hibás"] } },
		});
	});
});
