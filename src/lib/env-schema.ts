import { z } from "zod";

export const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
	NEXTAUTH_SECRET: z.string().min(32, "Must contain at least 32 characters"),
	NEXTAUTH_URL: z.url({ protocol: /^https?$/ }),
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
