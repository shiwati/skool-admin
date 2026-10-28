import { describe, expect, it } from "vitest";
import { parseEnv } from "./env-schema";

const valid = {
	DATABASE_URL: "postgresql://test:test@localhost:5432/test",
	NEXTAUTH_SECRET: "test-only-secret-with-at-least-32-characters",
	NEXTAUTH_URL: "http://localhost:3000",
};

describe("environment validation", () => {
	it("parses valid configuration and defaults", () => {
		expect(parseEnv(valid)).toMatchObject({
			NODE_ENV: "development",
			LOG_LEVEL: "info",
		});
	});

	it.each([
		["DATABASE_URL", undefined],
		["DATABASE_URL", "https://example.test"],
		["DATABASE_URL", "not a URL"],
		["NEXTAUTH_SECRET", "short"],
		["NEXTAUTH_URL", "ftp://example.test"],
		["NEXTAUTH_URL", "not a URL"],
		["LOG_LEVEL", "verbose"],
		["PUPPETEER_EXECUTABLE_PATH", ""],
	])("rejects invalid %s without exposing its value", (key, value) => {
		expect(() => parseEnv({ ...valid, [key]: value })).toThrow(key);
		try {
			parseEnv({ ...valid, [key]: value });
		} catch (error) {
			expect(String(error)).not.toContain(valid.NEXTAUTH_SECRET);
		}
	});
});
