import { describe, expect, it } from "vitest";
import { evaluateSignIn } from "./access-policy";

const domain = "skool.org.hu";

describe("evaluateSignIn", () => {
	it("allows a verified Skool Workspace account", () => {
		expect(
			evaluateSignIn(
				{
					email: "anna.kovacs@skool.org.hu",
					email_verified: true,
					hd: "skool.org.hu",
				},
				domain,
			),
		).toEqual({ allowed: true });
	});

	it("denies a gmail account", () => {
		expect(
			evaluateSignIn(
				{ email: "luca.nagy@gmail.com", email_verified: true },
				domain,
			),
		).toEqual({ allowed: false, reason: "wrong_hosted_domain" });
	});

	it("denies a consumer account using a Skool address without an hd claim", () => {
		expect(
			evaluateSignIn(
				{ email: "anna.kovacs@skool.org.hu", email_verified: true },
				domain,
			),
		).toEqual({ allowed: false, reason: "wrong_hosted_domain" });
	});

	it.each([false, undefined, "true"])(
		"denies when email_verified is %s",
		(emailVerified) => {
			expect(
				evaluateSignIn(
					{
						email: "anna.kovacs@skool.org.hu",
						email_verified: emailVerified,
						hd: "skool.org.hu",
					},
					domain,
				),
			).toEqual({ allowed: false, reason: "unverified_email" });
		},
	);

	it("denies a mismatched hosted domain", () => {
		expect(
			evaluateSignIn(
				{
					email: "anna.kovacs@skool.org.hu",
					email_verified: true,
					hd: "other.org",
				},
				domain,
			),
		).toEqual({ allowed: false, reason: "wrong_hosted_domain" });
	});

	it.each([
		"anna.kovacs@other.org",
		"anna.kovacs@sub.skool.org.hu",
		"no-at-sign",
		undefined,
	])("denies email %s whose domain does not match", (email) => {
		expect(
			evaluateSignIn(
				{ email, email_verified: true, hd: "skool.org.hu" },
				domain,
			),
		).toEqual({ allowed: false, reason: "wrong_email_domain" });
	});

	it("matches hosted and email domains case-insensitively", () => {
		expect(
			evaluateSignIn(
				{
					email: "Anna.Kovacs@SKOOL.org.HU",
					email_verified: true,
					hd: "Skool.Org.Hu",
				},
				"Skool.org.hu",
			),
		).toEqual({ allowed: true });
	});

	it("fails closed for a missing profile or empty domain", () => {
		expect(evaluateSignIn(undefined, domain).allowed).toBe(false);
		expect(
			evaluateSignIn(
				{ email: "a@skool.org.hu", email_verified: true, hd: "" },
				"",
			).allowed,
		).toBe(false);
	});
});
