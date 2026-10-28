export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./lib/env");
		const { logger } = await import("./lib/logger");
		logger.info("Application environment validated");
	}
}
