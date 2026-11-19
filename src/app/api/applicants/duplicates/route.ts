import { handleQuery, jsonResponse } from "@/lib/api/handler";
import {
	duplicatesQuerySchema,
	getDuplicatePair,
} from "@/lib/applicants/duplicates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A következő eldöntetlen duplikátumpár (azonos `duplicateKey`, egyik sem
 * törölt, nincs rá "nem duplikáció" döntés) és az ilyen párok száma.
 */
export async function GET(request: Request) {
	return handleQuery(request, duplicatesQuerySchema, async ({ skip }) =>
		jsonResponse(await getDuplicatePair(skip)),
	);
}
