/**
 * Pure mapping from Google Form response sheets to applicant/application
 * data. Columns are matched by header text (keywords, not exact strings), so
 * small wording changes between forms keep working.
 */

import { FIELD_LABELS } from "@/lib/applicants/field-labels";

export type ApplicantData = {
	firstName: string;
	lastName: string;
	email: string;
	birthYear: number | null;
	schoolName: string | null;
	hometown: string | null;
	phoneNumber: string | null;
	parentFirstName: string | null;
	parentLastName: string | null;
	parentMothersName: string | null;
	parentAddress: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	newsletter: boolean;
};

export type ApplicationData = {
	receivedAt: Date | null;
	foodPreference: string | null;
	heardFromWhere: string | null;
	heardFromWhom: string | null;
	solvedProblem: string | null;
	pastExpInProg: string | null;
	pastParticipationOther: string | null;
	pastParticipationSkool: boolean;
	pastParticipationSkoolDesc: string | null;
	companyAwareness: boolean;
};

export type ApplicationField = keyof ApplicantData | keyof ApplicationData;
type Field = ApplicationField;
type Cell = string | number | boolean | null | undefined;

export function normalizeHeader(header: string): string {
	return header.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

const has = (h: string, ...words: string[]) => words.some((w) => h.includes(w));
const isParent = (h: string) => has(h, "szülő", "törvényes képviselő");

/** Ordered: the first matching rule wins, so specific rules come first. */
const RULES: [Field, (h: string) => boolean][] = [
	["receivedAt", (h) => has(h, "időbélyeg", "timestamp")],
	// Parent / legal guardian
	["parentMothersName", (h) => isParent(h) && has(h, "anyj")],
	["parentLastName", (h) => isParent(h) && has(h, "vezetékne")],
	["parentFirstName", (h) => isParent(h) && has(h, "utóne", "keresztne")],
	// Before the address rule: "Szülő e-mail címe" also contains "cím".
	[
		"parentEmail",
		(h) =>
			has(h, "e-mail", "email") &&
			(isParent(h) || has(h, "visszaigazol")),
	],
	["parentAddress", (h) => isParent(h) && has(h, "cím", "lakcím")],
	[
		"parentPhone",
		(h) => has(h, "telefon") && (isParent(h) || has(h, "telefonszámod")),
	],
	// Applicant
	["lastName", (h) => has(h, "vezetéknév")],
	["firstName", (h) => has(h, "utónév", "keresztnév")],
	["birthYear", (h) => has(h, "születtél", "születési év")],
	["schoolName", (h) => has(h, "iskol")],
	["hometown", (h) => has(h, "település", "lakóhely")],
	["phoneNumber", (h) => has(h, "telefon")],
	["email", (h) => has(h, "e-mail", "email")],
	// Application
	["solvedProblem", (h) => has(h, "problém")],
	["pastParticipationSkoolDesc", (h) => h.startsWith("ha igen")],
	["pastParticipationSkool", (h) => has(h, "skool foglalkozás")],
	["pastParticipationOther", (h) => has(h, "informatikai foglalkozás")],
	["pastExpInProg", (h) => has(h, "programoztál")],
	["heardFromWhom", (h) => has(h, "kitől")],
	["heardFromWhere", (h) => has(h, "honnan")],
	[
		"companyAwareness",
		(h) => has(h, "partneri vállalat", "partnercég", "sigm"),
	],
	["foodPreference", (h) => has(h, "étel", "étkezés")],
	["newsletter", (h) => has(h, "értesülni", "hírlevél")],
];

export const REQUIRED_FIELDS = ["lastName", "firstName", "email"] as const;

/**
 * Az importálható mezők felirata, a szerkesztőfelület sorrendjében: a közös
 * mezőfeliratok (`FIELD_LABELS`), plusz az időbélyeg.
 */
export const APPLICATION_FIELD_LABELS: Record<ApplicationField, string> = {
	receivedAt: "Jelentkezés időpontja (időbélyeg)",
	lastName: FIELD_LABELS.lastName,
	firstName: FIELD_LABELS.firstName,
	email: FIELD_LABELS.email,
	birthYear: FIELD_LABELS.birthYear,
	schoolName: FIELD_LABELS.schoolName,
	hometown: FIELD_LABELS.hometown,
	phoneNumber: FIELD_LABELS.phoneNumber,
	parentLastName: FIELD_LABELS.parentLastName,
	parentFirstName: FIELD_LABELS.parentFirstName,
	parentMothersName: FIELD_LABELS.parentMothersName,
	parentAddress: FIELD_LABELS.parentAddress,
	parentEmail: FIELD_LABELS.parentEmail,
	parentPhone: FIELD_LABELS.parentPhone,
	newsletter: FIELD_LABELS.newsletter,
	foodPreference: FIELD_LABELS.foodPreference,
	heardFromWhere: FIELD_LABELS.heardFromWhere,
	heardFromWhom: FIELD_LABELS.heardFromWhom,
	solvedProblem: FIELD_LABELS.solvedProblem,
	pastExpInProg: FIELD_LABELS.pastExpInProg,
	pastParticipationOther: FIELD_LABELS.pastParticipationOther,
	pastParticipationSkool: FIELD_LABELS.pastParticipationSkool,
	pastParticipationSkoolDesc: FIELD_LABELS.pastParticipationSkoolDesc,
	companyAwareness: FIELD_LABELS.companyAwareness,
};

export const APPLICATION_FIELDS = Object.keys(
	APPLICATION_FIELD_LABELS,
) as ApplicationField[];

/**
 * Eventenként mentett megfeleltetés: mező → a sheet pontos fejléce. A
 * hiányzó mező nem importálódik. `null` = alapértelmezett (kulcsszavas).
 */
export type ApplicationSheetMapping = Partial<Record<ApplicationField, string>>;

export type HeaderMapping = {
	columns: Partial<Record<Field, number>>;
	/** Headers that matched no field (or a field already taken). */
	unmapped: string[];
	missingRequired: Field[];
};

/** Fejlécszöveg → első oszlopindex (normalizált, pontos egyezés). */
export function headerIndex(headers: Cell[]): Map<string, number> {
	const index = new Map<string, number>();
	headers.forEach((raw, i) => {
		const header = normalizeHeader(raw == null ? "" : String(raw));
		if (header && !index.has(header)) index.set(header, i);
	});
	return index;
}

/** A megfeleltetéssel lefedett oszlopokon kívüli, nem üres fejlécek. */
export function unusedHeaders(
	headers: Cell[],
	used: Iterable<number>,
): string[] {
	const taken = new Set(used);
	return headers.flatMap((raw, i) => {
		const text = raw == null ? "" : String(raw).trim();
		return text && !taken.has(i) ? [text] : [];
	});
}

export function mapHeaders(
	headers: Cell[],
	override?: ApplicationSheetMapping | null,
): HeaderMapping {
	if (override) return mapHeadersExact(headers, override);
	const columns: Partial<Record<Field, number>> = {};
	const unmapped: string[] = [];

	headers.forEach((raw, index) => {
		const text = raw === null || raw === undefined ? "" : String(raw);
		const header = normalizeHeader(text);
		if (!header) return;
		const rule = RULES.find(([, test]) => test(header));
		if (rule && columns[rule[0]] === undefined) {
			columns[rule[0]] = index;
		} else {
			unmapped.push(text.trim());
		}
	});

	const missingRequired = REQUIRED_FIELDS.filter(
		(field) => columns[field] === undefined,
	);
	return { columns, unmapped, missingRequired };
}

function mapHeadersExact(
	headers: Cell[],
	override: ApplicationSheetMapping,
): HeaderMapping {
	const index = headerIndex(headers);
	const columns: Partial<Record<Field, number>> = {};
	for (const [field, header] of Object.entries(override)) {
		const i = header ? index.get(normalizeHeader(header)) : undefined;
		if (i !== undefined && field in APPLICATION_FIELD_LABELS) {
			columns[field as Field] = i;
		}
	}
	return {
		columns,
		unmapped: unusedHeaders(headers, Object.values(columns)),
		missingRequired: REQUIRED_FIELDS.filter(
			(field) => columns[field] === undefined,
		),
	};
}

/** A kulcsszavas felismerés eredménye pontos fejlécekként (a szerkesztő alapértéke). */
export function defaultApplicationMapping(
	headers: Cell[],
): ApplicationSheetMapping {
	const result: ApplicationSheetMapping = {};
	for (const [field, i] of Object.entries(mapHeaders(headers).columns)) {
		result[field as Field] = String(headers[i!]).trim();
	}
	return result;
}

function text(value: Cell): string | null {
	if (value === null || value === undefined) return null;
	const result = String(value).trim();
	return result === "" ? null : result;
}

function yes(value: Cell): boolean {
	if (typeof value === "boolean") return value;
	const t = text(value)?.toLowerCase();
	return t !== undefined && t !== null && /^(igen|yes|true)\b/.test(t);
}

function year(value: Cell): number | null {
	const match = /\b(19|20)\d{2}\b/.exec(text(value) ?? "");
	return match ? Number(match[0]) : null;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(instant: number, timeZone: string): number {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-US", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
			.formatToParts(new Date(instant))
			.map((p) => [p.type, Number(p.value)]),
	);
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);
	return asUtc - Math.floor(instant / 1000) * 1000;
}

const SHEETS_EPOCH = Date.UTC(1899, 11, 30);

/** Converts a Sheets date-time serial number (wall clock in `timeZone`). */
export function serialToDate(serial: number, timeZone: string): Date {
	const wallClock = Math.round(SHEETS_EPOCH + serial * 86_400_000);
	const first = wallClock - zoneOffset(wallClock, timeZone);
	return new Date(wallClock - zoneOffset(first, timeZone));
}

export type ParsedRow =
	| {
			ok: true;
			applicant: ApplicantData;
			application: ApplicationData;
			/** Identifies the response within its event (timestamp + email). */
			sourceKey: string;
	  }
	| { ok: false; reason: string }
	| { ok: "empty" };

export function parseRow(
	row: Cell[],
	columns: HeaderMapping["columns"],
	timeZone: string,
): ParsedRow {
	if (row.every((cell) => text(cell) === null)) return { ok: "empty" };

	const get = (field: Field): Cell => {
		const index = columns[field];
		return index === undefined ? null : row[index];
	};
	const str = (field: Field) => text(get(field));

	const firstName = str("firstName");
	const lastName = str("lastName");
	const email = str("email")?.toLowerCase() ?? null;
	if (!firstName || !lastName) return { ok: false, reason: "Hiányzó név" };
	if (!email || !email.includes("@")) {
		return { ok: false, reason: "Hiányzó vagy hibás e-mail cím" };
	}

	const timestamp = get("receivedAt");
	return {
		ok: true,
		sourceKey: `${text(timestamp) ?? `${lastName}|${firstName}`}|${email}`,
		applicant: {
			firstName,
			lastName,
			email,
			birthYear: year(get("birthYear")),
			schoolName: str("schoolName"),
			hometown: str("hometown"),
			phoneNumber: str("phoneNumber"),
			parentFirstName: str("parentFirstName"),
			parentLastName: str("parentLastName"),
			parentMothersName: str("parentMothersName"),
			parentAddress: str("parentAddress"),
			parentEmail: str("parentEmail")?.toLowerCase() ?? null,
			parentPhone: str("parentPhone"),
			newsletter: yes(get("newsletter")),
		},
		application: {
			receivedAt:
				typeof timestamp === "number"
					? serialToDate(timestamp, timeZone)
					: null,
			foodPreference: str("foodPreference"),
			heardFromWhere: str("heardFromWhere"),
			heardFromWhom: str("heardFromWhom"),
			solvedProblem: str("solvedProblem"),
			pastExpInProg: str("pastExpInProg"),
			pastParticipationOther: str("pastParticipationOther"),
			pastParticipationSkool: yes(get("pastParticipationSkool")),
			pastParticipationSkoolDesc: str("pastParticipationSkoolDesc"),
			companyAwareness: yes(get("companyAwareness")),
		},
	};
}
