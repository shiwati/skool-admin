// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEvent, getAdminSession, tx, transaction } = vi.hoisted(() => {
	const tx = {
		event: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
		history: { createMany: vi.fn(), create: vi.fn() },
	};
	return {
		getEvent: vi.fn(),
		getAdminSession: vi.fn(),
		tx,
		transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
	};
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { $transaction: transaction } }));
vi.mock("@/lib/events/queries", () => ({ getEvent }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/session", () => ({ getAdminSession }));

import { DELETE, GET, PATCH } from "./route";

const ctx = { params: Promise.resolve({ id: "e1" }) } as never;

const existing = {
	id: "e1",
	name: "Tábor",
	from: new Date("2026-07-01T08:00:00Z"),
	to: new Date("2026-07-05T16:00:00Z"),
	companyName: "Sigma",
	location: null,
	description: null,
	tags: [],
	applicationSheetUrl: null,
	participantFeedbackSheetUrl: null,
	mentorFeedbackSheetUrl: null,
	ageRange: null,
	instructor: null,
	mentors: [],
	capacity: 20,
};

describe("GET /api/events/[id]", () => {
	const get = () => GET(new Request("http://x/api/events/e1"), ctx);

	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("rejects unauthenticated requests", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await get();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(getEvent).not.toHaveBeenCalled();
	});

	it("returns 404 for an unknown event", async () => {
		getEvent.mockResolvedValue(null);
		expect((await get()).status).toBe(404);
	});

	it("returns the event", async () => {
		getEvent.mockResolvedValue(existing);
		const res = await get();
		expect(res.status).toBe(200);
		expect((await res.json()).name).toBe("Tábor");
		expect(getEvent).toHaveBeenCalledWith("e1");
	});
});

describe("PATCH /api/events/[id]", () => {
	const patch = (body: unknown) =>
		PATCH(
			new Request("http://x/api/events/e1", {
				method: "PATCH",
				body: typeof body === "string" ? body : JSON.stringify(body),
			}),
			ctx,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		transaction.mockImplementation((fn) => fn(tx));
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
		tx.event.findUnique.mockResolvedValue(existing);
	});

	it("rejects unauthenticated requests", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await patch({ name: "x" });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(transaction).not.toHaveBeenCalled();
	});

	it("rejects invalid bodies", async () => {
		expect((await patch("{")).status).toBe(400);
		expect((await patch({})).status).toBe(400);
		const res = await patch({ name: "" });
		expect(res.status).toBe(400);
		expect((await res.json()).details.fieldErrors).toHaveProperty("name");
		expect(transaction).not.toHaveBeenCalled();
	});

	it("returns 404 for an unknown event", async () => {
		tx.event.findUnique.mockResolvedValue(null);
		expect((await patch({ name: "x" })).status).toBe(404);
		expect(tx.event.update).not.toHaveBeenCalled();
	});

	it("rejects an end earlier than the stored start", async () => {
		const res = await patch({ to: "2026-06-30T00:00:00Z" });
		expect(res.status).toBe(400);
		expect((await res.json()).details.fieldErrors).toHaveProperty("to");
		expect(tx.event.update).not.toHaveBeenCalled();
	});

	it("updates the event and records each changed field in History", async () => {
		const res = await patch({
			name: " Nyári tábor ",
			companyName: null,
			capacity: 20,
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ id: "e1" });
		expect(tx.event.update).toHaveBeenCalledWith({
			where: { id: "e1" },
			data: { name: "Nyári tábor", companyName: null, capacity: 20 },
		});
		expect(tx.history.createMany).toHaveBeenCalledWith({
			data: [
				{
					tableName: "event",
					recordId: "e1",
					createdById: "u1",
					fieldName: "name",
					oldValue: "Tábor",
					newValue: "Nyári tábor",
				},
				{
					tableName: "event",
					recordId: "e1",
					createdById: "u1",
					fieldName: "companyName",
					oldValue: "Sigma",
					newValue: null,
				},
			],
		});
	});

	it("clears a text field sent as blank", async () => {
		tx.event.findUnique.mockResolvedValue({
			...existing,
			location: "Pécs",
		});
		const res = await patch({ location: "  " });
		expect(res.status).toBe(200);
		expect(tx.event.update).toHaveBeenCalledWith({
			where: { id: "e1" },
			data: { location: null },
		});
		expect(tx.history.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					fieldName: "location",
					oldValue: "Pécs",
					newValue: null,
				}),
			],
		});
	});

	it("rejects an invalid sheet URL", async () => {
		const res = await patch({ participantFeedbackSheetUrl: "nope" });
		expect(res.status).toBe(400);
		expect((await res.json()).details.fieldErrors).toHaveProperty(
			"participantFeedbackSheetUrl",
		);
		expect(transaction).not.toHaveBeenCalled();
	});

	it("writes nothing when no value changes", async () => {
		const res = await patch({ name: "Tábor", capacity: 20 });
		expect(res.status).toBe(200);
		expect(tx.event.update).not.toHaveBeenCalled();
		expect(tx.history.createMany).not.toHaveBeenCalled();
	});
});

describe("DELETE /api/events/[id]", () => {
	const del = () =>
		DELETE(
			new Request("http://x/api/events/e1", { method: "DELETE" }),
			ctx,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		transaction.mockImplementation((fn) => fn(tx));
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
		tx.event.findUnique.mockResolvedValue({ name: "Tábor" });
	});

	it("rejects unauthenticated requests", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await del();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(transaction).not.toHaveBeenCalled();
	});

	it("returns 404 for an unknown event", async () => {
		tx.event.findUnique.mockResolvedValue(null);
		expect((await del()).status).toBe(404);
		expect(tx.event.delete).not.toHaveBeenCalled();
		expect(tx.history.create).not.toHaveBeenCalled();
	});

	it("hard-deletes the event and records a 'deleted' History row", async () => {
		const res = await del();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: "e1" });
		expect(tx.event.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
		expect(tx.history.create).toHaveBeenCalledWith({
			data: {
				tableName: "event",
				recordId: "e1",
				createdById: "u1",
				fieldName: "deleted",
				oldValue: "Tábor",
				newValue: null,
			},
		});
	});

	it("returns 500 without details when the database fails", async () => {
		tx.event.delete.mockRejectedValue(new Error("private details"));
		const res = await del();
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal Server Error" });
	});
});
