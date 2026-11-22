import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";
import { handleBody, jsonResponse, notFound } from "@/lib/api/handler";
import { idListSchema } from "@/lib/api/query";
import {
	ApplicationsNotFoundError,
	updateApplicationStatuses,
} from "@/lib/applications/update-status";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
	ids: idListSchema,
	status: z.enum(ApplicationStatus),
});

/**
 * Tömeges státuszmódosítás egy program jelentkezésein. Az `(admin)` layout
 * nem védi a Route Handlereket; a session-t a `handleBody` ellenőrzi.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/applicants/status">,
) {
	return handleBody(
		request,
		bodySchema,
		async ({ ids, status }, { userId }) => {
			const { id: eventId } = await params;
			const result = await updateApplicationStatuses(
				db,
				eventId,
				ids,
				status,
				userId,
			);
			logger.info({
				event: "applications.status_changed",
				userId,
				count: result.updated,
			});
			return jsonResponse(result);
		},
		{
			event: "applications.status_change_failed",
			mapError: (error) =>
				error instanceof ApplicationsNotFoundError
					? notFound()
					: undefined,
		},
	);
}
