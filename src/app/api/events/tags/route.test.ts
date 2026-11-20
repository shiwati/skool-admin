// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, queryRaw } = vi.hoisted(() => ({
	getSession: vi.fn(),
	queryRaw: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: queryRaw } }));

import { GET } from "./route";

const call = () => GET(new Request("http://x/api/events/tags"));

describe("GET /api/events/tags", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: {} });
	});

	it("requires a session", async () => {
		getSession.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(queryRaw).not.toHaveBeenCalled();
	});

	it("returns the tags in use with counts, most used first, then Hungarian order, uncached", async () => {
		queryRaw.mockResolvedValue([
			{ name: "élmény", count: BigInt(1) },
			{ name: "robotika", count: BigInt(2) },
			{ name: "ablak", count: BigInt(1) },
		]);
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({
			items: [
				{ name: "robotika", count: 2 },
				{ name: "ablak", count: 1 },
				{ name: "élmény", count: 1 },
			],
		});
	});

	it("returns an empty list when no program has tags", async () => {
		queryRaw.mockResolvedValue([]);
		expect(await (await call()).json()).toEqual({ items: [] });
	});
});
