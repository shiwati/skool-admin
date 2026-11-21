import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

import { syncMessage } from "./feedback-sync-button";

describe("syncMessage", () => {
	it("summarises new rows per synced role", () => {
		expect(
			syncMessage({
				PARTICIPANT: { created: 3, existing: 0, errors: [] },
			}),
		).toBe("résztvevő: 3 új");
	});

	it("adds faulty row counts and lists both roles in order", () => {
		expect(
			syncMessage({
				MENTOR: { created: 0, existing: 4, errors: [{}] },
				PARTICIPANT: {
					created: 12,
					existing: 0,
					errors: [{}, {}],
				},
			}),
		).toBe("résztvevő: 12 új, 2 hibás sor; mentor: 0 új, 1 hibás sor");
	});
});
