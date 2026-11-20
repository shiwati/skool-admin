// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSession, update, info, error } = vi.hoisted(() => ({
	getAdminSession: vi.fn(),
	update: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { marker: "db" } }));
vi.mock("@/lib/logger", () => ({ logger: { info, error } }));
vi.mock("@/lib/applications/update-status", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("@/lib/applications/update-status")
		>();
	return { ...actual, updateApplicationStatuses: update };
});

import { ApplicationsNotFoundError } from "@/lib/applications/update-status";
import { POST } from "./route";

const post = (body: unknown, raw = false) =>
	POST(
		new Request("http://x/api/events/e1/applicants/status", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: raw ? (body as string) : JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id: "e1" }) } as never,
	);

describe("POST /api/events/[id]/applicants/status", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({
			user: { id: "u1", email: "anna@skool.org.hu" },
		});
		update.mockResolvedValue({ updated: 2, skipped: 0 });
	});

	it("rejects requests without a session", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await post({ ids: ["a1"], status: "ACCEPTED" });
		expect(res.status).toBe(401);
		expect(update).not.toHaveBeenCalled();
	});

	it.each([
		["empty list", { ids: [], status: "ACCEPTED" }],
		[
			"too many ids",
			{
				ids: Array.from({ length: 101 }, (_, i) => `a${i}`),
				status: "ACCEPTED",
			},
		],
		["duplicate ids", { ids: ["a1", "a1"], status: "ACCEPTED" }],
		["unknown status", { ids: ["a1"], status: "NOPE" }],
		["missing status", { ids: ["a1"] }],
	])("answers 400 for %s", async (_, body) => {
		const res = await post(body);
		expect(res.status).toBe(400);
		expect(update).not.toHaveBeenCalled();
	});

	it("answers 400 for malformed JSON", async () => {
		expect((await post("{not json", true)).status).toBe(400);
	});

	it("updates, returns the counts and logs without personal data", async () => {
		const res = await post({ ids: ["a1", "a2"], status: "ACCEPTED" });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ updated: 2, skipped: 0 });
		expect(update).toHaveBeenCalledWith(
			{ marker: "db" },
			"e1",
			["a1", "a2"],
			"ACCEPTED",
			"u1",
		);
		const logged = JSON.stringify(info.mock.calls);
		expect(logged).not.toContain("anna@skool.org.hu");
		expect(logged).not.toContain("a1");
	});

	it("answers 404 when an application is not in the event", async () => {
		update.mockRejectedValue(new ApplicationsNotFoundError());
		expect((await post({ ids: ["x"], status: "ACCEPTED" })).status).toBe(
			404,
		);
	});

	it("answers 500 without details on unexpected errors", async () => {
		update.mockRejectedValue(new Error("secret detail"));
		const res = await post({ ids: ["a1"], status: "ACCEPTED" });
		expect(res.status).toBe(500);
		expect(await res.text()).not.toContain("secret detail");
		expect(error).toHaveBeenCalled();
	});
});
