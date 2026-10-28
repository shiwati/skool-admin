import pino from "pino";

export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	base: { service: "skool-admin" },
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
