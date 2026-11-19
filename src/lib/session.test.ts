// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, redirect } = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT ${url}`);
	}),
}));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ authOptions: { marker: "authOptions" } }));

import { getAdminSession, requireAdmin } from "./session";

const session = {
	user: { name: "Anna Kovács" },
	expires: "2099-01-01T00:00:00.000Z",
};

describe("session helpers", () => {
	beforeEach(() => vi.clearAllMocks());

	it("getAdminSession reads the session with the app auth options", async () => {
		getServerSession.mockResolvedValue(session);
		await expect(getAdminSession()).resolves.toBe(session);
		expect(getServerSession).toHaveBeenCalledWith({
			marker: "authOptions",
		});
	});

	it("getAdminSession returns null when signed out", async () => {
		getServerSession.mockResolvedValue(null);
		await expect(getAdminSession()).resolves.toBeNull();
	});

	it("requireAdmin redirects to login with an encoded return path", async () => {
		getServerSession.mockResolvedValue(null);
		await expect(requireAdmin("/applicants?page=2&q=a b")).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(redirect).toHaveBeenCalledWith(
			"/login?callbackUrl=%2Fapplicants%3Fpage%3D2%26q%3Da%20b",
		);
	});

	it("requireAdmin returns an existing session", async () => {
		getServerSession.mockResolvedValue(session);
		await expect(requireAdmin("/")).resolves.toBe(session);
		expect(redirect).not.toHaveBeenCalled();
	});
});
