/**
 * Server-side access policy for Google sign-in. Pure and fail-closed: any
 * missing or unexpected claim results in denial.
 */

export type SignInProfile = {
	email?: unknown;
	email_verified?: unknown;
	hd?: unknown;
};

export type DenialReason =
	"unverified_email" | "wrong_hosted_domain" | "wrong_email_domain";

export type SignInDecision =
	{ allowed: true } | { allowed: false; reason: DenialReason };

export function evaluateSignIn(
	profile: SignInProfile | null | undefined,
	domain: string,
): SignInDecision {
	const allowedDomain = domain.trim().toLowerCase();

	if (profile?.email_verified !== true) {
		return { allowed: false, reason: "unverified_email" };
	}

	const hostedDomain =
		typeof profile.hd === "string" ? profile.hd.toLowerCase() : null;
	if (!allowedDomain || hostedDomain !== allowedDomain) {
		return { allowed: false, reason: "wrong_hosted_domain" };
	}

	const email = typeof profile.email === "string" ? profile.email : "";
	const at = email.lastIndexOf("@");
	const emailDomain = at > 0 ? email.slice(at + 1).toLowerCase() : null;
	if (emailDomain !== allowedDomain) {
		return { allowed: false, reason: "wrong_email_domain" };
	}

	return { allowed: true };
}
