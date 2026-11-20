import { z } from "zod";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import { listTagOptions } from "@/lib/events/tag-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A programokon használt címkék darabszámmal (`{ items: { name, count }[] }`):
 * a címkeszűrő és a program űrlapjának címkemezője ebből dolgozik.
 */
export async function GET(request: Request) {
	return handleQuery(request, z.object({}), async () =>
		jsonResponse({ items: await listTagOptions() }),
	);
}
