import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	// Generation and installation do not require a live database or secrets.
	datasource: { url: process.env.DATABASE_URL ?? "" },
});
