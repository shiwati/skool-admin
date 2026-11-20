import { initials } from "@/lib/initials";
import type {
	ApplicantApplication,
	ApplicantListItem,
	ApplicationStatus,
} from "./types";

/** Hiányzó érték jelölése a táblában. */
export const EMPTY = "—";

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

const dateParts = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Europe/Budapest",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const timeParts = new Intl.DateTimeFormat("en-GB", {
	timeZone: "Europe/Budapest",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

function toDate(value: Date | string): Date | null {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** `ÉÉÉÉ.HH.NN` budapesti idő szerint. */
export function formatDate(value: Date | string): string {
	const date = toDate(value);
	if (!date) return EMPTY;
	return dateParts.format(date).replaceAll("-", ".");
}

/** `ÉÉÉÉ.HH.NN ÓÓ:PP` budapesti idő szerint. */
export function formatDateTime(value: Date | string): string {
	const date = toDate(value);
	if (!date) return EMPTY;
	return `${formatDate(date)} ${timeParts.format(date)}`;
}

/** `ÉÉÉÉ.HH.NN – ÉÉÉÉ.HH.NN` budapesti idő szerint. */
export function formatDateRange(
	from: Date | string,
	to: Date | string,
): string {
	return `${formatDate(from)} – ${formatDate(to)}`;
}

/** Alumni: legalább egy „Részt vett” státuszú jelentkezés. */
export function isAlumni(
	applications: { status: ApplicationStatus }[],
): boolean {
	return applications.some((a) => a.status === "ATTENDED");
}

/** „N jelentkezés · M elvégzett”. */
export function programsSummary(
	applications: { status: ApplicationStatus }[],
): string {
	const done = applications.filter((a) => a.status === "ATTENDED").length;
	return `${formatCount(applications.length)} jelentkezés · ${formatCount(done)} elvégzett`;
}

const countFormat = new Intl.NumberFormat("hu-HU", { useGrouping: "always" });

/** Magyar ezres tagolás nem törő szóközzel: 1248 → "1 248". */
export function formatCount(value: number): string {
	return countFormat.format(value);
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
	APPLIED: "Új jelentkező",
	ACCEPTED: "Elfogadva",
	WAITLISTED: "Várólista",
	ATTENDED: "Részt vett",
	REJECTED: "Elutasítva",
};

/** Státusz → háttérszín (DS.1 tokenek); a szöveg mindig sötét. */
export const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
	APPLIED: "bg-sky",
	ACCEPTED: "bg-lavender",
	WAITLISTED: "bg-peach",
	ATTENDED: "bg-lemon",
	REJECTED: "bg-surface-subtle",
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
 * Magyar telefonszám megjelenítése `+36 30 123 4567` alakban (mobil/vidék:
 * +36 xx xxx xxxx, Budapest: +36 1 xxx xxxx). Ismeretlen vagy külföldi szám
 * változatlanul marad.
 */
export function formatPhone(value: string): string {
	const trimmed = value.trim();
	const digits = trimmed.replace(/\D/g, "");
	let national: string | null = null;
	if (/^\+\s*36/.test(trimmed)) national = digits.slice(2);
	else if (/^0036/.test(trimmed)) national = digits.slice(4);
	else if (/^06/.test(trimmed)) national = digits.slice(2);
	if (national === null || !/^\d+$/.test(national)) return value;
	if (national.startsWith("1")) {
		if (national.length !== 8) return value;
		return `+36 1 ${national.slice(1, 4)} ${national.slice(4)}`;
	}
	if (national.length === 9 || national.length === 8) {
		return `+36 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
	}
	return value;
}
