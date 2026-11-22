// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, findEvent, upsertReport, copyDriveFile, logError } =
	vi.hoisted(() => ({
		getSession: vi.fn(),
		findEvent: vi.fn(),
		upsertReport: vi.fn(),
		copyDriveFile: vi.fn(),
		logError: vi.fn(),
	}));
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/db", () => ({
	db: {
		event: { findUnique: findEvent },
		eventReport: { upsert: upsertReport },
	},
}));
vi.mock("@/lib/logger", () => ({
	logger: { info: vi.fn(), error: logError },
}));
vi.mock("@/lib/google/docs", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/google/docs")>()),
	copyDriveFile,
}));

import { PUT } from "./route";

const content = {
	people: [{ role: "Oktató", organization: "Skool", name: "Anna" }],
	quotes: [
		{
			feedbackId: "f1",
			questionKey: "q1",
			text: "Nagyon jó volt",
			highlighted: true,
		},
	],
	disabledMetrics: [],
};

const call = (body: unknown, id = "e1") =>
	PUT(
		new Request(`http://x/api/events/${id}/report`, {
			method: "PUT",
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id }) },
	);

describe("PUT /api/events/[id]/report", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		findEvent.mockResolvedValue({ id: "e1" });
		upsertReport.mockResolvedValue({});
	});

	it("rejects a request without an admin session", async () => {
		getSession.mockResolvedValue(null);
		const response = await call({ content });
		expect(response.status).toBe(401);
		expect(findEvent).not.toHaveBeenCalled();
		expect(upsertReport).not.toHaveBeenCalled();
	});

	it("rejects a body that is not JSON", async () => {
		const response = await call("{");
		expect(response.status).toBe(400);
		expect(upsertReport).not.toHaveBeenCalled();
	});

	it("rejects invalid content with field errors", async () => {
		const response = await call({
			content: { ...content, people: [{ role: "", name: "" }] },
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: "Invalid request body",
			details: expect.any(Object),
		});
		expect(upsertReport).not.toHaveBeenCalled();
	});

	it("rejects a body without content", async () => {
		expect((await call({})).status).toBe(400);
		expect(upsertReport).not.toHaveBeenCalled();
	});

	it("returns 404 and saves nothing for an unknown event", async () => {
		findEvent.mockResolvedValue(null);
		const response = await call({ content }, "does-not-exist");
		expect(response.status).toBe(404);
		expect(findEvent).toHaveBeenCalledWith({
			where: { id: "does-not-exist" },
			select: { id: true },
		});
		expect(upsertReport).not.toHaveBeenCalled();
	});

	it("saves the content as the event's single report and records the editor", async () => {
		const response = await call({ content });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(upsertReport).toHaveBeenCalledWith({
			where: { eventId: "e1" },
			create: { eventId: "e1", content, updatedById: "u1" },
			update: { content, updatedById: "u1" },
		});
		expect(copyDriveFile).not.toHaveBeenCalled();
	});

	it("replaces the content on a second save (one report per event)", async () => {
		const second = {
			...content,
			quotes: [{ ...content.quotes[0], text: "Még jobb lett" }],
		};
		await call({ content });
		await call({ content: second });
		expect(upsertReport).toHaveBeenCalledTimes(2);
		const last = upsertReport.mock.calls[1][0];
		expect(last.where).toEqual({ eventId: "e1" });
		expect(last.update.content).toEqual(second);
	});

	it("returns 500 without error details when the database fails", async () => {
		const error = new Error("private connection details");
		upsertReport.mockRejectedValue(error);
		const response = await call({ content });
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body).toEqual({ error: "Internal Server Error" });
		expect(JSON.stringify(body)).not.toContain("private");
		expect(logError).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "event_report.save_failed",
				err: error,
			}),
			"API request failed",
		);
	});
});
