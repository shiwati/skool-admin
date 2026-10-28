import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"server-only": fileURLToPath(
				new URL("./tests/server-only.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./tests/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			include: [
				"src/lib/**/*.ts",
				"src/hooks/**/*.ts",
				"src/components/**/*.tsx",
				"src/app/api/health/route.ts",
			],
			exclude: ["src/**/*.test.{ts,tsx}"],
		},
	},
});
