// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { warn, info } = vi.hoisted(() => ({ warn: vi.fn(), info: vi.fn() }));
const { updateAccount } = vi.hoisted(() => ({ updateAccount: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { account: { update: updateAccount } } }));
vi.mock("@/lib/env", () => ({
	env: {
		NEXTAUTH_SECRET: "test-only-secret-with-at-least-32-characters",
		GOOGLE_CLIENT_ID: "test-client-id",
		GOOGLE_CLIENT_SECRET: "test-client-secret",
		AUTH_ALLOWED_DOMAIN: "skool.org.hu",
	},
}));
vi.mock("@/lib/logger", () => ({
	logger: { warn, info, error: vi.fn(), debug: vi.fn() },
}));

import type { Account, Profile, Session, User } from "next-auth";
import { authOptions } from "./auth";

const callbacks = authOptions.callbacks!;
const events = authOptions.events!;
const baseUrl = "http://localhost:3000";

async function signIn(profile: Record<string, unknown>) {
	return callbacks.signIn!({
		user: { id: "u1", email: profile.email as string } as User,
		account: {
			provider: "google",
			type: "oauth",
			providerAccountId: "123",
			access_token: "secret-access-token",
			id_token: "secret-id-token",
		} as Account,
		profile: profile as Profile,
	});
}

function loggedText(mock: ReturnType<typeof vi.fn>) {
	return JSON.stringify(mock.mock.calls);
}

describe("authOptions", () => {
	beforeEach(() => vi.clearAllMocks());

	it("configures Google with the account chooser and domain hint", () => {
		expect(authOptions.providers).toHaveLength(1);
		const google = authOptions.providers[0] as unknown as {
			id: string;
			options: { authorization: { params: Record<string, string> } };
		};
		expect(google.id).toBe("google");
		expect(google.options.authorization.params).toEqual({
			prompt: "consent select_account",
			access_type: "offline",
			scope: "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly",
			hd: "skool.org.hu",
		});
		expect(authOptions.pages).toEqual({
			signIn: "/login",
			error: "/login",
		});
	});

	it("allows a verified Workspace account", async () => {
		await expect(
			signIn({
				email: "anna.kovacs@skool.org.hu",
				email_verified: true,
				hd: "skool.org.hu",
			}),
		).resolves.toBe(true);
		expect(warn).not.toHaveBeenCalled();
	});

	it("denies an outside account with a redirect and a log without the email", async () => {
		const result = await signIn({
			email: "luca.nagy@gmail.com",
			email_verified: true,
		});
		expect(result).toBe(
			"/login?error=AccessDenied&account=luca.nagy%40gmail.com",
		);
		expect(warn).toHaveBeenCalledWith({
			event: "auth.denied",
			reason: "wrong_hosted_domain",
		});
		expect(loggedText(warn)).not.toContain("luca.nagy");
	});

	it("denies without an account parameter when the email is missing", async () => {
		await expect(signIn({ email_verified: false })).resolves.toBe(
			"/login?error=AccessDenied",
		);
		expect(warn).toHaveBeenCalledWith({
			event: "auth.denied",
			reason: "unverified_email",
		});
	});

	it("logs sign-in and sign-out events with the user id only", async () => {
		await events.signIn!({
			user: {
				id: "u1",
				email: "anna.kovacs@skool.org.hu",
				name: "Anna Kovács",
			} as User,
			account: {
				provider: "google",
				type: "oauth",
				providerAccountId: "123",
				access_token: "secret-access-token",
			} as Account,
			profile: { email: "anna.kovacs@skool.org.hu" } as Profile,
			isNewUser: false,
		});
		// With database sessions NextAuth passes the adapter session row.
		const adapterSession = {
			userId: "u1",
			sessionToken: "secret-session-token",
			expires: new Date(),
		};
		await events.signOut!({
			session: adapterSession as unknown as Session,
			token: null as never,
		});

		expect(info).toHaveBeenNthCalledWith(1, {
			event: "auth.signin",
			userId: "u1",
		});
		expect(info).toHaveBeenNthCalledWith(2, {
			event: "auth.signout",
			userId: "u1",
		});
		const text = loggedText(info);
		for (const secret of [
			"anna.kovacs",
			"Anna Kovács",
			"secret-access-token",
			"secret-session-token",
		]) {
			expect(text).not.toContain(secret);
		}
	});

	it("stores fresh Google tokens on sign-in, keeping the old refresh token if none is returned", async () => {
		await events.signIn!({
			user: { id: "u1" } as User,
			account: {
				provider: "google",
				type: "oauth",
				providerAccountId: "123",
				access_token: "new-access",
				expires_at: 100,
				scope: "openid email",
			} as Account,
			isNewUser: false,
		});
		expect(updateAccount).toHaveBeenCalledWith({
			where: {
				provider_providerAccountId: {
					provider: "google",
					providerAccountId: "123",
				},
			},
			data: {
				access_token: "new-access",
				expires_at: 100,
				scope: "openid email",
				id_token: undefined,
				token_type: undefined,
			},
		});
	});

	it("adds the user id to the session", async () => {
		const session = await callbacks.session!({
			session: { user: { email: "a@b.hu" }, expires: "" },
			user: { id: "u1" },
		} as never);
		expect((session as Session).user?.id).toBe("u1");
	});

	it.each([
		["https://evil.example/", baseUrl],
		["//evil.example/path", `${baseUrl}//evil.example/path`],
		["not a url", baseUrl],
		["/applicants?page=2", `${baseUrl}/applicants?page=2`],
		[`${baseUrl}/programs`, `${baseUrl}/programs`],
	])("redirect(%s) stays same-origin", async (url, expected) => {
		expect(await callbacks.redirect!({ url, baseUrl })).toBe(expected);
	});
});
