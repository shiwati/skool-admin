/**
 * Visszajelző űrlap sheetjének tiszta feldolgozása: fejléc → kérdéskulcs,
 * sor → `Feedback` adatok. Adatbázis nélkül tesztelhető.
 */
import {
	headerIndex,
	normalizeHeader,
	serialToDate,
	unusedHeaders,
} from "@/lib/sheet-import/mapping";
import {
	isTimestampHeader,
	QUESTIONS,
	TIMESTAMP_KEY,
	toQuestion,
	type FeedbackRoleKey,
	type FeedbackSheetMapping,
	type Question,
	type Recommend,
} from "./questions";

type Cell = string | number | boolean | null | undefined;

export type AnswerValue = string | number;
export type Answers = Record<string, AnswerValue>;

export type FeedbackHeaderMapping = {
	timestamp: number | undefined;
	/** Kérdéskulcs → oszlopindex. */
	columns: Record<string, number>;
	unmapped: string[];
	/** Hiányzó kötelező oszlopok (feliratuk). */
	missingRequired: string[];
	/** Az importált kérdések (katalógus + az event egyéni kérdései). */
	questions?: Question[];
};

function missingRequired(
	questions: Question[],
	timestamp: number | undefined,
	columns: Record<string, number>,
): string[] {
	return [
		...(timestamp === undefined ? ["Időbélyeg"] : []),
		...questions
			.filter((q) => q.required && columns[q.key] === undefined)
			.map((q) => q.label),
	];
}

function mapFeedbackHeadersExact(
	role: FeedbackRoleKey,
	headers: Cell[],
	override: FeedbackSheetMapping,
): FeedbackHeaderMapping {
	const index = headerIndex(headers);
	const find = (header: string | undefined) =>
		header ? index.get(normalizeHeader(header)) : undefined;
	const custom = override.custom.map(toQuestion);
	const questions = [...QUESTIONS[role], ...custom];

	const columns: Record<string, number> = {};
	for (const q of QUESTIONS[role]) {
		const i = find(override.columns[q.key]);
		if (i !== undefined) columns[q.key] = i;
	}
	override.custom.forEach((c, n) => {
		const i = find(c.header);
		if (i !== undefined) columns[custom[n].key] = i;
	});
	const timestamp = find(override.columns[TIMESTAMP_KEY]);
	return {
		timestamp,
		columns,
		questions,
		unmapped: unusedHeaders(headers, [
			...Object.values(columns),
			...(timestamp === undefined ? [] : [timestamp]),
		]),
		missingRequired: missingRequired(questions, timestamp, columns),
	};
}

/** A kulcsszavas felismerés eredménye pontos fejlécekként (a szerkesztő alapértéke). */
export function defaultFeedbackMapping(
	role: FeedbackRoleKey,
	headers: Cell[],
): FeedbackSheetMapping {
	const { timestamp, columns } = mapFeedbackHeaders(role, headers);
	const header = (i: number) => String(headers[i]).trim();
	return {
		columns: {
			...(timestamp === undefined
				? {}
				: { [TIMESTAMP_KEY]: header(timestamp) }),
			...Object.fromEntries(
				Object.entries(columns).map(([key, i]) => [key, header(i)]),
			),
		},
		custom: [],
	};
}

export function mapFeedbackHeaders(
	role: FeedbackRoleKey,
	headers: Cell[],
	override?: FeedbackSheetMapping | null,
): FeedbackHeaderMapping {
	if (override) return mapFeedbackHeadersExact(role, headers, override);
	const questions = QUESTIONS[role];
	const columns: Record<string, number> = {};
	const unmapped: string[] = [];
	let timestamp: number | undefined;

	headers.forEach((raw, index) => {
		const text = raw === null || raw === undefined ? "" : String(raw);
		const header = normalizeHeader(text);
		if (!header) return;
		if (timestamp === undefined && isTimestampHeader(header)) {
			timestamp = index;
			return;
		}
		const question = questions.find(
			(q) => columns[q.key] === undefined && q.match(header),
		);
		if (question) columns[question.key] = index;
		else unmapped.push(text.trim());
	});

	return {
		timestamp,
		columns,
		unmapped,
		missingRequired: missingRequired(questions, timestamp, columns),
	};
}

function text(value: Cell): string | null {
	if (value === null || value === undefined) return null;
	const result = String(value).trim();
	return result === "" ? null : result;
}

/** 1–5 egész, vagy `null` (szövegből is: „5”, „4 - jó”). */
export function parseScale(value: Cell): number | null {
	if (typeof value === "number") {
		return Number.isInteger(value) && value >= 1 && value <= 5
			? value
			: null;
	}
	const match = /^\s*([1-5])\b/.exec(text(value) ?? "");
	return match ? Number(match[1]) : null;
}

/** Igen / Talán (Lehet) / Nem → normalizált érték. */
export function parseRecommend(value: Cell): Recommend | null {
	const t = text(value)?.toLowerCase();
	if (!t) return null;
	if (/^(igen|yes)\b/.test(t)) return "yes";
	if (/^(talán|lehet|maybe)\b/.test(t)) return "maybe";
	if (/^(nem|no)\b/.test(t)) return "no";
	return null;
}

function parseAnswer(question: Question, value: Cell): AnswerValue | null {
	switch (question.kind) {
		case "scale":
			return parseScale(value);
		case "year": {
			const match = /\b(19|20)\d{2}\b/.exec(text(value) ?? "");
			return match ? Number(match[0]) : null;
		}
		default:
			return text(value);
	}
}

/** Kitöltetlennek számító szöveges válaszok („-”, „nincs” stb. megmaradnak, csak a kötőjel nem). */
function isBlankText(value: string): boolean {
	return /^[-–—.]+$/.test(value);
}

export type ParsedFeedback = {
	sourceKey: string;
	submittedAt: Date | null;
	answers: Answers;
	overallScore: number | null;
	recommend: Recommend | null;
	searchText: string;
};

export type ParsedFeedbackRow =
	| ({ ok: true } & ParsedFeedback)
	| { ok: false; reason: string }
	| { ok: "empty" };

/** Összértékelés: résztvevőnél a mentor- és oktatóértékelés átlaga, mentornál a saját összértékelése. */
export function overallScore(
	role: FeedbackRoleKey,
	answers: Answers,
): number | null {
	const keys =
		role === "PARTICIPANT"
			? ["mentorRating", "instructorRating"]
			: ["overallRating"];
	const values = keys
		.map((key) => answers[key])
		.filter((v): v is number => typeof v === "number");
	if (values.length === 0) return null;
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	return Math.round(avg * 10) / 10;
}

/** Rövid, determinisztikus hash (FNV-1a) a sor tartalmából. */
function hash(value: string): string {
	let h = 0x811c9dc5;
	for (const char of value) {
		h ^= char.codePointAt(0)!;
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, "0");
}

/**
 * `occurrence`: hányadik sor ugyanezzel az időbélyeggel (0-tól), hogy két
 * azonos másodpercben beküldött válasz se olvadjon össze.
 */
export function parseFeedbackRow(
	role: FeedbackRoleKey,
	row: Cell[],
	mapping: FeedbackHeaderMapping,
	timeZone: string,
	occurrence = 0,
): ParsedFeedbackRow {
	if (row.every((cell) => text(cell) === null)) return { ok: "empty" };

	const questions = mapping.questions ?? QUESTIONS[role];
	const answers: Answers = {};
	for (const question of questions) {
		const index = mapping.columns[question.key];
		if (index === undefined) continue;
		const value = parseAnswer(question, row[index]);
		if (value === null) continue;
		if (typeof value === "string" && isBlankText(value)) continue;
		answers[question.key] = value;
	}
	if (Object.keys(answers).length === 0) {
		return { ok: false, reason: "Nincs értelmezhető válasz" };
	}

	const timestamp =
		mapping.timestamp === undefined ? null : row[mapping.timestamp];
	const submittedAt =
		typeof timestamp === "number"
			? serialToDate(timestamp, timeZone)
			: null;

	const searchText = questions
		.filter((q) => q.kind === "text" && typeof answers[q.key] === "string")
		.map((q) => answers[q.key])
		.join("\n")
		.toLowerCase();

	return {
		ok: true,
		// A sheetben javított cella nem hoz létre új választ; időbélyeg nélkül
		// (kézzel felvett sor) a tartalom azonosít.
		sourceKey:
			text(timestamp) !== null
				? `${text(timestamp)}#${occurrence}`
				: `row:${hash(JSON.stringify(row.map(text)))}`,
		submittedAt,
		answers,
		overallScore: overallScore(role, answers),
		recommend: parseRecommend(row[mapping.columns.recommend ?? -1]),
		searchText,
	};
}
