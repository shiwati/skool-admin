import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		await db.$queryRaw`SELECT 1`;
		return NextResponse.json(
			{ status: "ok", checks: { database: "up" } },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		logger.error({ err: error }, "Health check failed");
		return NextResponse.json(
			{ status: "error", checks: { database: "down" } },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
