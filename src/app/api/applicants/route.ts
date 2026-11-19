import { handleQuery, jsonResponse } from "@/lib/api/handler";
import { applicantsQuerySchema, listApplicants } from "@/lib/applicants/list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleQuery(request, applicantsQuerySchema, async (query) =>
		jsonResponse(await listApplicants(query)),
	);
}
