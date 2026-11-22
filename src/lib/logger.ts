import pino from "pino";

/**
 * Az `err` mező szerializálója. A Prisma-hibák üzenete (és így a stack első
 * sora) a lekérdezés argumentumait is idézheti – neveket, e-mail-címeket –,
 * ezért ezekből csak a típus, a kód és a meta kerül a logba.
 */
export function serializeError(error: unknown) {
	if (error instanceof Error && error.name.startsWith("PrismaClient")) {
		const { code, meta } = error as { code?: unknown; meta?: unknown };
		return { type: error.name, code, meta };
	}
	return error instanceof Error ? pino.stdSerializers.err(error) : error;
}

export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	base: { service: "skool-admin" },
	serializers: { err: serializeError },
	redact: {
		paths: [
			"password",
			"secret",
			"token",
			"access_token",
			"refresh_token",
			"req.headers.authorization",
			"req.headers.cookie",
			"res.headers.set-cookie",
		],
		censor: "[REDACTED]",
	},
	...(process.env.NODE_ENV === "development"
		? {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				},
			}
		: {}),
});
