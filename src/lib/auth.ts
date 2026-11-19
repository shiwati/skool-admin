import "server-only";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { evaluateSignIn, type SignInProfile } from "@/lib/access-policy";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db),
	secret: env.NEXTAUTH_SECRET,
	session: { strategy: "database" },
	providers: [
		GoogleProvider({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			authorization: {
				params: {
					// Always show the account chooser so "Másik Google-fiók
					// választása" lets the user pick a different account.
					prompt: "select_account",
					// UI hint only; the claims are enforced in `signIn` below.
					hd: env.AUTH_ALLOWED_DOMAIN,
				},
			},
		}),
	],
	pages: { signIn: "/login", error: "/login" },
	callbacks: {
		// Runs before the adapter creates or links any user, account or session,
		// so a denial leaves the database untouched.
		signIn({ profile }) {
			const decision = evaluateSignIn(
				profile as SignInProfile | undefined,
				env.AUTH_ALLOWED_DOMAIN,
			);
			if (decision.allowed) return true;

			logger.warn({ event: "auth.denied", reason: decision.reason });
			const params = new URLSearchParams({ error: "AccessDenied" });
			if (typeof profile?.email === "string") {
				params.set("account", profile.email);
			}
			return `/login?${params.toString()}`;
		},
		// Same-origin only (NextAuth's default behaviour), kept explicit so it is
		// covered by tests: off-site callback URLs resolve to the base URL.
		redirect({ url, baseUrl }) {
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			try {
				if (new URL(url).origin === baseUrl) return url;
			} catch {
				// Malformed URL: fall through to the base URL.
			}
			return baseUrl;
		},
		// Expose the internal user id so write endpoints can record who acted
		// (e.g. `deletedById`, History). Never put tokens or emails here.
		session({ session, user }) {
			if (session.user) session.user.id = user.id;
			return session;
		},
	},
	events: {
		signIn({ user }) {
			logger.info({ event: "auth.signin", userId: user.id });
		},
		signOut({ session }) {
			const userId = (session as { userId?: string } | null)?.userId;
			logger.info({ event: "auth.signout", userId });
		},
	},
	logger: {
		error(code, metadata) {
			logger.error({ code, metadata }, "Authentication error");
		},
		warn(code) {
			logger.warn({ code }, "Authentication warning");
		},
		debug(code) {
			logger.debug({ code }, "Authentication debug");
		},
	},
};
