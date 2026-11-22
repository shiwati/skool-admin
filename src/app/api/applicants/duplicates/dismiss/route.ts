import { z } from "zod";
import { handleBody, jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
	.object({ applicantIds: z.tuple([z.string().min(1), z.string().min(1)]) })
	.refine((v) => v.applicantIds[0] !== v.applicantIds[1], {
		message: "applicantIds must differ",
		path: ["applicantIds"],
	});

/**
 * "Nem duplikáció": a pár többé nem jelenik meg a duplikáció-ellenőrzésben.
 * A döntés csak erre a párra szól; egy később érkező, azonos kulcsú
 * jelentkező bármelyikükkel új párt alkot. A `duplicateFlag` nem változik.
 */
export async function POST(request: Request) {
	return handleBody(
		request,
		bodySchema,
		async ({ applicantIds }, { userId }) => {
			const [applicantAId, applicantBId] = applicantIds.toSorted();
			const applicants = await db.applicant.findMany({
				where: {
					id: { in: [applicantAId, applicantBId] },
					deletedAt: null,
				},
				select: { duplicateKey: true },
			});
			if (applicants.length !== 2) {
				return jsonResponse({ error: "Applicant not found" }, 404);
			}
			const [x, y] = applicants;
			if (!x.duplicateKey || x.duplicateKey !== y.duplicateKey) {
				return jsonResponse(
					{ error: "Applicants are not duplicates" },
					409,
				);
			}

			await db.$transaction([
				db.duplicateDismissal.createMany({
					data: [{ applicantAId, applicantBId, createdById: userId }],
					skipDuplicates: true,
				}),
				db.history.create({
					data: {
						tableName: "applicant",
						fieldName: "duplicate_dismissed",
						oldValue: null,
						newValue: applicantBId,
						recordId: applicantAId,
						createdById: userId,
					},
				}),
			]);

			logger.info({ event: "applicant.duplicate_dismissed", userId });
			return jsonResponse({ dismissed: true });
		},
		{ event: "applicant.duplicate_dismiss_failed" },
	);
}
