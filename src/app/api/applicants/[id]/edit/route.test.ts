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
vi.mock("@/lib/applicants/update", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/lib/applicants/update")>();
	return { ...actual, updateApplicant: update };
});

import {
	ApplicantConflictError,
	ApplicantNotFoundError,
} from "@/lib/applicants/update";
import { POST } from "./route";

const body = {
	lastName: "Nagy",
	firstName: "Luca",
	birthYear: "2010",
	email: "nagy.luca@gmail.com",
	phoneNumber: "+36 30 555 1234",
	schoolName: "",
	hometown: "Budapest",
	parentLastName: "",
	parentFirstName: "",
	parentMothersName: "",
	parentAddress: "",
	parentEmail: "",
	parentPhone: "",
	newsletter: true,
	expectedUpdatedAt: "2026-11-19T10:00:00.000Z",
};

const post = (payload: unknown, raw = false) =>
	POST(
		new Request("http://x/api/applicants/a1/edit", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: raw ? (payload as string) : JSON.stringify(payload),
		}),
		{ params: Promise.resolve({ id: "a1" }) },
	);

describe("POST /api/applicants/[id]/edit", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({
			user: { id: "u1", email: "anna@skool.org.hu" },
		});
		update.mockResolvedValue({
			updatedAt: new Date("2026-11-19T10:05:00.000Z"),
			changed: 2,
		});
	});

	it("rejects requests without a session or user id", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await post(body);
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		getAdminSession.mockResolvedValue({ user: {} });
		expect((await post(body)).status).toBe(401);
		expect(update).not.toHaveBeenCalled();
	});

	it("rejects malformed JSON", async () => {
		expect((await post("{nope", true)).status).toBe(400);
	});

	it("returns field errors for an invalid e-mail", async () => {
		const res = await post({ ...body, email: "nagy.luca@gmail" });
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.details.fieldErrors.email).toEqual([
			"Érvénytelen e-mail cím",
		]);
		expect(update).not.toHaveBeenCalled();
	});

	it("requires the loaded modification time", async () => {
		const rest: Partial<typeof body> = { ...body };
		delete rest.expectedUpdatedAt;
		expect((await post(rest)).status).toBe(400);
	});

	it("saves the converted values and returns the new modification time", async () => {
		const res = await post(body);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toContain("no-store");
		expect(await res.json()).toEqual({
			updatedAt: "2026-11-19T10:05:00.000Z",
		});
		expect(update).toHaveBeenCalledWith(
			{ marker: "db" },
			"a1",
			expect.objectContaining({
				birthYear: 2010,
				schoolName: null,
				newsletter: true,
			}),
			new Date("2026-11-19T10:00:00.000Z"),
			"u1",
		);
		expect(info).toHaveBeenCalledWith({
			event: "applicant.updated",
			userId: "u1",
			changed: 2,
		});
	});

	it("maps not found, conflict and unexpected errors without details", async () => {
		update.mockRejectedValueOnce(new ApplicantNotFoundError());
		expect((await post(body)).status).toBe(404);

		update.mockRejectedValueOnce(new ApplicantConflictError());
		const conflict = await post(body);
		expect(conflict.status).toBe(409);
		expect(await conflict.json()).toEqual({ error: "Conflict" });

		update.mockRejectedValueOnce(new Error("db exploded: secret detail"));
		const failed = await post(body);
		expect(failed.status).toBe(500);
		expect(await failed.text()).not.toContain("secret");
	});
});
