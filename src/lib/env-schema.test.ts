import { describe, expect, it } from "vitest";
import { parseEnv } from "./env-schema";

const valid = {
	DATABASE_URL: "postgresql://test:test@localhost:5432/test",
	NEXTAUTH_SECRET: "test-only-secret-with-at-least-32-characters",
	NEXTAUTH_URL: "http://localhost:3000",
	GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
	GOOGLE_CLIENT_SECRET: "test-only-google-client-secret-value",
	AUTH_ALLOWED_DOMAIN: "skool.org.hu",
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
		["GOOGLE_CLIENT_ID", undefined],
		["GOOGLE_CLIENT_ID", "   "],
		["GOOGLE_CLIENT_SECRET", undefined],
		["GOOGLE_CLIENT_SECRET", ""],
		["AUTH_ALLOWED_DOMAIN", undefined],
		["AUTH_ALLOWED_DOMAIN", "not a hostname"],
		["AUTH_ALLOWED_DOMAIN", "@skool.org.hu"],
		["AUTH_ALLOWED_DOMAIN", "https://skool.org.hu"],
		["AUTH_ALLOWED_DOMAIN", "localhost"],
	])("rejects invalid %s without exposing its value", (key, value) => {
		expect(() => parseEnv({ ...valid, [key]: value })).toThrow(key);
		try {
			parseEnv({ ...valid, [key]: value });
		} catch (error) {
			expect(String(error)).not.toContain(valid.NEXTAUTH_SECRET);
			expect(String(error)).not.toContain(valid.GOOGLE_CLIENT_SECRET);
			expect(String(error)).not.toContain(valid.GOOGLE_CLIENT_ID);
		}
	});

	it("normalises the allowed domain to lower case", () => {
		expect(
			parseEnv({ ...valid, AUTH_ALLOWED_DOMAIN: "Skool.org.hu" })
				.AUTH_ALLOWED_DOMAIN,
		).toBe("skool.org.hu");
	});
});
