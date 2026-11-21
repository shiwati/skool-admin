import { db } from "@/lib/db";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import {
	eventApplicationsQuerySchema,
	listEventApplications,
} from "@/lib/events/applications-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/applicants">,
) {
	const { id } = await params;

	return handleQuery(request, eventApplicationsQuerySchema, async (query) => {
		const event = await db.event.findUnique({
			where: { id },
			select: { id: true },
		});
		if (!event) return jsonResponse({ error: "Event not found" }, 404);

		return jsonResponse(await listEventApplications(id, query));
	});
}
