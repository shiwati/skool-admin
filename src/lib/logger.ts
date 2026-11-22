import pino from "pino";

/** Egy stack-sor: `    at fn (fájl:sor:oszlop)` vagy `    at fájl:sor:oszlop`. */
const STACK_FRAME = /^\s+at .*:\d+:\d+\)?$/;

/** A stack hívási sorai, a hibaüzenet nélkül. */
function stackFrames(error: Error): string | undefined {
	return error.stack
		?.split("\n")
		.filter((line) => STACK_FRAME.test(line))
		.join("\n");
}

/**
 * Az `err` mező szerializálója. A Prisma-hibák üzenete (többsoros, és így a
 * stack eleje is) a lekérdezés argumentumait idézheti – neveket,
 * e-mail-címeket –, ezért ezekből a típus, a kód, a meta és a stack hívási
 * sorai kerülnek a logba. Kivétel a kapcsolódási hiba
 * (`PrismaClientInitializationError`): annak üzenete nem tartalmaz
 * rekordadatot, ezért megmarad. Fejlesztői módban (csak lokális mintaadat)
 * minden hiba teljes egészében a logba kerül.
 */
export function serializeError(
	error: unknown,
	nodeEnv: string | undefined = process.env.NODE_ENV,
) {
	if (!(error instanceof Error)) return error;
	if (nodeEnv === "development" || !error.name.startsWith("PrismaClient")) {
		return pino.stdSerializers.err(error);
	}
	const { code, meta, errorCode } = error as {
		code?: unknown;
		meta?: unknown;
		errorCode?: unknown;
	};
	const isInitialization = error.name === "PrismaClientInitializationError";
	return {
		type: error.name,
		...(code !== undefined && { code }),
		...(errorCode !== undefined && { errorCode }),
		...(meta !== undefined && { meta }),
		...(isInitialization && { message: error.message }),
		stack: stackFrames(error),
	};
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
