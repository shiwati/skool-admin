// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEvent, getAdminSession, tx, transaction } = vi.hoisted(() => {
	const tx = {
		event: { findUnique: vi.fn(), update: vi.fn() },
		history: { createMany: vi.fn() },
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

import { GET, PATCH } from "./route";

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
	sheetUrl: null,
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
		expect((await get()).status).toBe(401);
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
		expect((await patch({ name: "x" })).status).toBe(401);
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

	it("writes nothing when no value changes", async () => {
		const res = await patch({ name: "Tábor", capacity: 20 });
		expect(res.status).toBe(200);
		expect(tx.event.update).not.toHaveBeenCalled();
		expect(tx.history.createMany).not.toHaveBeenCalled();
	});
});
