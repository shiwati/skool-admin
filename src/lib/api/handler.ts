import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
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
	const session = await getAdminSession();
	if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

	const url = new URL(request.url);
	const parsed = schema.safeParse(searchParamsToObject(url.searchParams));
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
		// Csak a pathname: a query string (pl. `q`) keresett nevet vagy
		// e-mail-címet tartalmazhat.
		logger.error(
			{ event: "api.request_failed", path: url.pathname, err: error },
			"API request failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
