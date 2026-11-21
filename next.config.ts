import type { NextConfig } from "next";

/**
 * Security headers on every response. The CSP is deliberately limited to
 * directives that need no nonce (framing, <base>, plugins); a full script-src
 * policy would require per-request nonces for Next.js inline scripts.
 */
const securityHeaders = [
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains",
	},
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
	},
	{
		key: "Content-Security-Policy",
		value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
	},
];

const nextConfig: NextConfig = {
	experimental: {
		agentUpgrade: "security",
	},
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
		];
	},
	reactStrictMode: true,
	serverExternalPackages: [
		"pino",
		"pino-pretty",
		"@prisma/client",
		"@prisma/adapter-pg",
	],
};

export default nextConfig;
