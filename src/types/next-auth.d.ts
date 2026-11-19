import type { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		/** `id` is the internal `User.id`, set by the `session` callback in `src/lib/auth.ts`. */
		user?: DefaultSession["user"] & { id: string };
	}
}
