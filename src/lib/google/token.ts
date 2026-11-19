import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const GOOGLE_SHEETS_SCOPE =
	"https://www.googleapis.com/auth/spreadsheets.readonly";

/** The admin has to sign in again (missing scope or revoked refresh token). */
export class GoogleReauthRequiredError extends Error {
	constructor() {
		super("Google re-authentication required");
		this.name = "GoogleReauthRequiredError";
	}
}

const EXPIRY_MARGIN_SECONDS = 60;

/**
 * Returns a valid Google access token for the user, refreshing it with the
 * stored refresh token when it is about to expire.
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
	const account = await db.account.findFirst({
		where: { userId, provider: "google" },
	});
	if (!account?.scope?.split(" ").includes(GOOGLE_SHEETS_SCOPE)) {
		throw new GoogleReauthRequiredError();
	}

	const now = Math.floor(Date.now() / 1000);
	if (
		account.access_token &&
		account.expires_at &&
		account.expires_at - EXPIRY_MARGIN_SECONDS > now
	) {
		return account.access_token;
	}

	if (!account.refresh_token) throw new GoogleReauthRequiredError();

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: account.refresh_token,
			grant_type: "refresh_token",
		}),
		cache: "no-store",
	});
	if (response.status === 400 || response.status === 401) {
		// invalid_grant: revoked or expired refresh token.
		throw new GoogleReauthRequiredError();
	}
	if (!response.ok) {
		throw new Error(`Google token refresh failed (${response.status})`);
	}

	const tokens = (await response.json()) as {
		access_token: string;
		expires_in: number;
		refresh_token?: string;
	};
	await db.account.update({
		where: { id: account.id },
		data: {
			access_token: tokens.access_token,
			expires_at: now + tokens.expires_in,
			...(tokens.refresh_token && {
				refresh_token: tokens.refresh_token,
			}),
		},
	});
	return tokens.access_token;
}
