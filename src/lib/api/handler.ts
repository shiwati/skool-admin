import "server-only";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { formatValidationErrors } from "@/lib/validation";
import { searchParamsToObject } from "./query";

const noStore = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status = 200) {
	return NextResponse.json(body, { status, headers: noStore });
}

/**
 * Bejelentkezést ellenőriz, validálja a query paramétereket, és
 * egységesen kezeli a hibákat.
 */
export async function handleQuery<S extends z.ZodType>(
	request: Request,
	schema: S,
	run: (query: z.output<S>) => Promise<Response>,
): Promise<Response> {
	const session = await getServerSession(authOptions);
	if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

	const parsed = schema.safeParse(
		searchParamsToObject(new URL(request.url).searchParams),
	);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid query parameters",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	try {
		return await run(parsed.data);
	} catch (error) {
		logger.error({ err: error, url: request.url }, "API request failed");
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
