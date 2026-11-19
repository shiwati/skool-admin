// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSession, anonymize, info, error } = vi.hoisted(() => ({
	getAdminSession: vi.fn(),
	anonymize: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getAdminSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { marker: "db" } }));
vi.mock("@/lib/logger", () => ({ logger: { info, error } }));
vi.mock("@/lib/applicants/anonymize", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/lib/applicants/anonymize")>();
	return { ...actual, anonymizeApplicants: anonymize };
});

import { ApplicantsNotFoundError } from "@/lib/applicants/anonymize";
import { POST } from "./route";

const post = (body: unknown, raw = false) =>
	POST(
		new Request("http://x/api/applicants/delete", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: raw ? (body as string) : JSON.stringify(body),
		}),
	);

describe("POST /api/applicants/delete", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({
			user: { id: "u1", email: "anna@skool.org.hu" },
		});
		anonymize.mockResolvedValue({ deleted: 2 });
	});

	it("rejects requests without a session", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await post({ ids: ["a1"] });
		expect(res.status).toBe(401);
		expect(anonymize).not.toHaveBeenCalled();
	});

	it("rejects a session without a user id", async () => {
		getAdminSession.mockResolvedValue({ user: { email: "x@y.hu" } });
		expect((await post({ ids: ["a1"] })).status).toBe(401);
	});

	it.each([
		["empty list", { ids: [] }],
		[
			"too many ids",
			{ ids: Array.from({ length: 101 }, (_, i) => `a${i}`) },
		],
		["duplicate ids", { ids: ["a1", "a1"] }],
		["blank id", { ids: [" "] }],
		["wrong shape", { id: "a1" }],
	])("answers 400 for %s", async (_, body) => {
		const res = await post(body);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe("Invalid request body");
		expect(anonymize).not.toHaveBeenCalled();
	});

	it("answers 400 for malformed JSON", async () => {
		expect((await post("{not json", true)).status).toBe(400);
	});

	it("anonymizes, returns the count and logs without personal data", async () => {
		const res = await post({ ids: ["a1", "a2"] });
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await res.json()).toEqual({ deleted: 2 });
		expect(anonymize).toHaveBeenCalledWith(
			{ marker: "db" },
			["a1", "a2"],
			"u1",
		);
		expect(info).toHaveBeenCalledWith({
			event: "applicants.anonymized",
			userId: "u1",
			count: 2,
		});
		const logged = JSON.stringify(info.mock.calls);
		expect(logged).not.toContain("a1");
		expect(logged).not.toContain("anna@skool.org.hu");
	});

	it("answers 404 when an applicant does not exist", async () => {
		anonymize.mockRejectedValue(new ApplicantsNotFoundError());
		const res = await post({ ids: ["missing"] });
		expect(res.status).toBe(404);
		expect(info).not.toHaveBeenCalled();
	});

	it("answers 500 without details on unexpected errors", async () => {
		anonymize.mockRejectedValue(new Error("db exploded: secret detail"));
		const res = await post({ ids: ["a1"] });
		expect(res.status).toBe(500);
		const text = await res.text();
		expect(text).not.toContain("secret detail");
		expect(error).toHaveBeenCalled();
	});
});
