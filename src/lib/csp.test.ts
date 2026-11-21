import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

function directive(csp: string, name: string) {
	return csp
		.split("; ")
		.find((d) => d.startsWith(`${name} `))
		?.split(" ")
		.slice(1);
}

describe("buildCsp", () => {
	it("puts the nonce in script-src without unsafe-inline", () => {
		const scripts = directive(buildCsp("abc123", false), "script-src");
		expect(scripts).toContain("'nonce-abc123'");
		expect(scripts).toContain("'strict-dynamic'");
		expect(scripts).not.toContain("'unsafe-inline'");
	});

	it("allows unsafe-eval only in development", () => {
		expect(directive(buildCsp("n", false), "script-src")).not.toContain(
			"'unsafe-eval'",
		);
		expect(directive(buildCsp("n", true), "script-src")).toContain(
			"'unsafe-eval'",
		);
	});

	it("blocks framing, plugins and base-uri hijacking", () => {
		const csp = buildCsp("n", false);
		expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
		expect(directive(csp, "object-src")).toEqual(["'none'"]);
		expect(directive(csp, "base-uri")).toEqual(["'self'"]);
	});

	it("allows Google profile pictures and the Google sign-in redirect", () => {
		const csp = buildCsp("n", false);
		expect(directive(csp, "img-src")).toContain(
			"https://*.googleusercontent.com",
		);
		expect(directive(csp, "form-action")).toContain(
			"https://accounts.google.com",
		);
	});
});
