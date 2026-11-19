// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertLocalDatabase } from "./seed-guard";

describe("assertLocalDatabase", () => {
	it.each([
		"postgresql://u:p@localhost:5432/db",
		"postgresql://u:p@127.0.0.1:5432/db",
		"postgresql://u:p@[::1]:5432/db",
	])("allows local database %s", (url) => {
		expect(() => assertLocalDatabase(url, "development")).not.toThrow();
	});

	it("refuses a remote host", () => {
		expect(() =>
			assertLocalDatabase(
				"postgresql://u:p@db.example.com:5432/db",
				"development",
			),
		).toThrow(/not local/);
	});

	it("refuses production even on localhost", () => {
		expect(() =>
			assertLocalDatabase(
				"postgresql://u:p@localhost:5432/db",
				"production",
			),
		).toThrow(/production/);
	});

	it("refuses an invalid URL", () => {
		expect(() => assertLocalDatabase("not a url", "development")).toThrow(
			/not a valid URL/,
		);
	});
});
