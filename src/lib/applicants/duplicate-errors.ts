import "server-only";
import { jsonResponse } from "@/lib/api/handler";
import { DuplicateApplicantNotFoundError, NotDuplicatesError } from "./merge";

/** Az összevonás és a „Nem duplikáció” közös hibaválaszai (404 / 409). */
export function duplicateErrorResponse(error: unknown): Response | undefined {
	if (error instanceof DuplicateApplicantNotFoundError) {
		return jsonResponse({ error: "Applicant not found" }, 404);
	}
	if (error instanceof NotDuplicatesError) {
		return jsonResponse({ error: "Applicants are not duplicates" }, 409);
	}
	return undefined;
}
