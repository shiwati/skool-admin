// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_TAGS } from "@/lib/events/tags";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

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
	});

	it("returns every fixed tag in Hungarian alphabetical order, uncached", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		const { items } = await res.json();
		expect([...items].sort()).toEqual([...EVENT_TAGS].sort());
		expect(items).toEqual(
			[...EVENT_TAGS].sort(new Intl.Collator("hu").compare),
		);
	});
});
