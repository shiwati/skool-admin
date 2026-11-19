import { z } from "zod";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import { EVENT_TAGS } from "@/lib/events/tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sortedTags = [...EVENT_TAGS].sort(
	new Intl.Collator("hu", { sensitivity: "base" }).compare,
);

/**
 * A címke-multiselect opciólistája: a fix címkelista magyar ábécérendben.
 * Végpont marad (nem közvetlen import), hogy a lista később dinamikussá
 * válhasson a felület módosítása nélkül.
 */
export async function GET(request: Request) {
	return handleQuery(request, z.object({}), async () =>
		jsonResponse({ items: sortedTags }),
	);
}
