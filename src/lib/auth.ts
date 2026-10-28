import "server-only";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db),
	secret: env.NEXTAUTH_SECRET,
	session: { strategy: "database" },
	providers: [],
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
