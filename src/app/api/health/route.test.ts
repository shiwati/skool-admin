// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, logError } = vi.hoisted(() => ({
	query: vi.fn(),
	logError: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: query } }));
vi.mock("@/lib/logger", () => ({ logger: { error: logError } }));

import { GET } from "./route";

describe("GET /api/health", () => {
	beforeEach(() => vi.resetAllMocks());

	it("returns readiness when the database responds", async () => {
		query.mockResolvedValue([{ "?column?": 1 }]);
		const response = await GET();
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toEqual({
			status: "ok",
			checks: { database: "up" },
		});
	});

	it("returns 503 and logs database failures without leaking details", async () => {
		const error = new Error("private connection details");
		query.mockRejectedValue(error);
		const response = await GET();
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			status: "error",
			checks: { database: "down" },
		});
		expect(logError).toHaveBeenCalledWith(
			{ err: error },
			"Health check failed",
		);
	});
});
