import type { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		user?: DefaultSession["user"] & {
			/** Internal `User.id`, set by the `session` callback in `src/lib/auth.ts`. */
			id?: string;
		};
	}
}
