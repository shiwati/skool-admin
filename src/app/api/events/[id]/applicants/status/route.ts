import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/handler";
import {
	ApplicationsNotFoundError,
	updateApplicationStatuses,
} from "@/lib/applications/update-status";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the list's largest page size, so "select all on page" always fits.
const MAX_IDS = 100;

const bodySchema = z.object({
	ids: z
		.array(z.string().trim().min(1).max(64))
		.min(1)
		.max(MAX_IDS)
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "ids must be unique",
		}),
	status: z.enum(ApplicationStatus),
});

/**
 * Tömeges státuszmódosítás egy program jelentkezésein. Az `(admin)` layout
 * nem védi a Route Handlereket, ezért a session-t itt ellenőrizzük.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/applicants/status">,
) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!session || !userId)
		return jsonResponse({ error: "Unauthorized" }, 401);

	const { id: eventId } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid request body" }, 400);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	try {
		const result = await updateApplicationStatuses(
			db,
			eventId,
			parsed.data.ids,
			parsed.data.status,
			userId,
		);
		logger.info({
			event: "applications.status_changed",
			userId,
			count: result.updated,
		});
		return jsonResponse(result);
	} catch (error) {
		if (error instanceof ApplicationsNotFoundError) {
			return jsonResponse({ error: "Not Found" }, 404);
		}
		logger.error({ err: error }, "Application status update failed");
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
