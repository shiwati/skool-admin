import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		agentUpgrade: "security",
	},
	poweredByHeader: false,
	reactStrictMode: true,
	serverExternalPackages: [
		"pino",
		"pino-pretty",
		"puppeteer",
		"@prisma/client",
		"@prisma/adapter-pg",
	],
};

export default nextConfig;
