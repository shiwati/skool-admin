import "server-only";
import { SheetAccessError } from "@/lib/google/sheets";
import { GoogleReauthRequiredError } from "@/lib/google/token";
import { jsonResponse } from "./handler";

export const SHEET_REAUTH_MESSAGE =
	"Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.";

/**
 * A Google-hozzáférés közös hibáinak válasza: újra-bejelentkezés kell
 * (`403 REAUTH_REQUIRED`), vagy a sheet nem olvasható
 * (`422 SHEET_NOT_ACCESSIBLE`). Más hibára `undefined`.
 */
export function googleErrorResponse(
	error: unknown,
	reauthMessage = SHEET_REAUTH_MESSAGE,
): Response | undefined {
	if (error instanceof GoogleReauthRequiredError) {
		return jsonResponse(
			{ error: reauthMessage, code: "REAUTH_REQUIRED" },
			403,
		);
	}
	if (error instanceof SheetAccessError) {
		return jsonResponse(
			{ error: error.message, code: "SHEET_NOT_ACCESSIBLE" },
			422,
		);
	}
	return undefined;
}
