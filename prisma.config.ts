import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	// Generation and installation do not require a live database or secrets.
	// CLI commands (migrate, Studio) need the direct, non-pooled connection;
	// the app's runtime pool uses DATABASE_URL_POOLED (see src/lib/db.ts).
	datasource: { url: process.env.DATABASE_URL ?? "" },
});
