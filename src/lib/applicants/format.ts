import { EMPTY, formatCount } from "@/lib/format";
import { initials } from "@/lib/initials";
import type {
	ApplicantApplication,
	ApplicantListItem,
	ApplicationStatus,
} from "./types";

export function fullName(a: Pick<ApplicantListItem, "firstName" | "lastName">) {
	return `${a.lastName} ${a.firstName}`.trim();
}

export function applicantInitials(
	a: Pick<ApplicantListItem, "firstName" | "lastName">,
) {
	return initials(fullName(a));
}

/** Életkor ≈ aktuális év − születési év (ugyanígy szűr az API is). */
export function ageFromBirthYear(
	birthYear: number | null,
	now: Date = new Date(),
): number | null {
	return birthYear === null ? null : now.getFullYear() - birthYear;
}

export function isOver16(age: number | null): boolean {
	return age !== null && age >= 16;
}

/** A legfrissebb jelentkezés és a további jelentkezések száma. */
export function latestApplication(applications: ApplicantApplication[]): {
	latest: ApplicantApplication | null;
	more: number;
} {
	return {
		latest: applications[0] ?? null,
		more: Math.max(applications.length - 1, 0),
	};
}

export function attendedCount(applications: ApplicantApplication[]): number {
	return applications.filter((a) => a.status === "ATTENDED").length;
}

/** "N program" vagy "—", ha nincs elvégzett program. */
export function historyLabel(applications: ApplicantApplication[]): string {
	const count = attendedCount(applications);
	return count > 0 ? `${count} program` : EMPTY;
}

/** Automatikus/jelölő címkék (16+, Hírlevél, Veterán) színei – egy helyen, minden felület ezt használja. */
export const TAG_BADGE_CLASSES = {
	over16: "bg-info-bg text-info-fg",
	newsletter: "bg-success-bg text-success-fg",
	alumni: "bg-sage",
} as const;

/** Ennyi „Részt vett” státuszú jelentkezéstől jár az alumni címke. */
export const ALUMNI_MIN_ATTENDED = 3;

/** Az alumni címke megjelenített neve (egy helyen, hogy könnyű legyen átnevezni). */
export const ALUMNI_LABEL = "Veterán";

/** Az alumni címke magyarázata a felületen. */
export const ALUMNI_DESCRIPTION = `Legalább ${ALUMNI_MIN_ATTENDED} programon „Részt vett” státuszú; a rendszer automatikusan adja.`;

/** Alumni: legalább `ALUMNI_MIN_ATTENDED` „Részt vett” státuszú jelentkezés. */
export function isAlumni(
	applications: { status: ApplicationStatus }[],
): boolean {
	return (
		applications.filter((a) => a.status === "ATTENDED").length >=
		ALUMNI_MIN_ATTENDED
	);
}

/** „N jelentkezés · M elvégzett”. */
export function programsSummary(
	applications: { status: ApplicationStatus }[],
): string {
	const done = applications.filter((a) => a.status === "ATTENDED").length;
	return `${formatCount(applications.length)} jelentkezés · ${formatCount(done)} elvégzett`;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
	APPLIED: "Új jelentkező",
	ACCEPTED: "Elfogadva",
	WAITLISTED: "Várólista",
	ATTENDED: "Részt vett",
	REJECTED: "Elutasítva",
	CANCELLED: "Lemondta",
};

/** Státusz → háttérszín (DS.1 tokenek); a szöveg mindig sötét. */
export const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
	APPLIED: "bg-sky",
	ACCEPTED: "bg-mint",
	WAITLISTED: "bg-lemon",
	ATTENDED: "bg-lavender",
	REJECTED: "bg-surface-subtle",
	CANCELLED: "bg-peach",
};

const PROGRAM_COLORS = [
	"bg-lavender",
	"bg-sky",
	"bg-pink",
	"bg-peach",
	"bg-lemon",
	"bg-sage",
] as const;

/** Determinisztikus programszín az esemény id-jából (ugyanaz az id → ugyanaz a szín). */
export function programColorClass(eventId: string): string {
	let hash = 0;
	for (const char of eventId) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
	return PROGRAM_COLORS[hash % PROGRAM_COLORS.length];
}

/**
 * Vessző + szóköz elválasztású e-mail lista: üres címek kihagyva, a
 * kis- és nagybetűtől független ismétlődések közül az első alak marad.
 */
export function buildEmailList(emails: Iterable<string | null | undefined>): {
	text: string;
	count: number;
} {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of emails) {
		const email = raw?.trim();
		if (!email) continue;
		const key = email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(email);
	}
	return { text: result.join(", "), count: result.length };
}

export function parentLabel(a: ApplicantListItem): {
	name: string | null;
	email: string | null;
} {
	const name = [a.parentLastName, a.parentFirstName]
		.filter(Boolean)
		.join(" ");
	return { name: name || null, email: a.parentEmail };
}

/**
 * Magyar telefonszám megjelenítése `+36 30 123 4567` alakban (Budapest:
 * `+36 1 234 5678`). Felismeri a `+36`, `0036`, `06`, `36` előtagos és az
 * előtag nélküli (`30 123 4567`) bevitelt is, bármilyen tagolással. Külföldi
 * vagy ismeretlen szám változatlanul marad.
 */
export function formatPhone(value: string): string {
	const trimmed = value.trim();
	let digits = trimmed.replace(/\D/g, "");
	const international = /^(\+|00)/.test(trimmed);
	if (/^00/.test(trimmed)) digits = digits.slice(2);
	else if (!international && digits.startsWith("06")) {
		digits = `36${digits.slice(2)}`;
	} else if (
		!international &&
		!(digits.startsWith("36") && [10, 11].includes(digits.length)) &&
		[8, 9].includes(digits.length)
	) {
		digits = `36${digits}`;
	}
	if (!digits.startsWith("36")) return value;
	const national = digits.slice(2);
	if (national.startsWith("1")) {
		if (national.length !== 8) return value;
		return `+36 1 ${national.slice(1, 4)} ${national.slice(4)}`;
	}
	if (national.length === 9 || national.length === 8) {
		return `+36 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
	}
	return value;
}
