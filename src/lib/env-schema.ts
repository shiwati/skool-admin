import { z } from "zod";

export const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	/** Direkt (pooler nélküli) kapcsolat: Prisma CLI (migrációk, Studio) és seed. */
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
	/** Poololt kapcsolat az app futásidejére; ha nincs megadva, a `DATABASE_URL`. */
	DATABASE_URL_POOLED: z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === ""
				? undefined
				: value,
		z.url({ protocol: /^postgres(ql)?$/ }).optional(),
	),
	NEXTAUTH_SECRET: z.string().min(32, "Must contain at least 32 characters"),
	NEXTAUTH_URL: z.url({ protocol: /^https?$/ }),
	GOOGLE_CLIENT_ID: z.string().trim().min(1, "Required"),
	GOOGLE_CLIENT_SECRET: z.string().trim().min(1, "Required"),
	AUTH_ALLOWED_DOMAIN: z
		.string()
		.trim()
		.toLowerCase()
		.regex(
			/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
			"Must be a hostname such as example.org",
		),
	/** A záró riport Google Doc sablonjának azonosítója (a doksi URL-jéből). */
	REPORT_TEMPLATE_DOC_ID: z
		.string()
		.trim()
		.regex(/^[A-Za-z0-9_-]+$/, "Must be a Google Doc ID"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
		.default("info"),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnv(
	input: Record<string, string | undefined>,
): Environment {
	const result = envSchema.safeParse(input);
	if (!result.success) {
		const details = result.error.issues.map(
			(issue) => `${issue.path.join(".")}: ${issue.message}`,
		);
		throw new Error(
			`Invalid environment configuration:\n${details.join("\n")}`,
		);
	}
	return result.data;
}
