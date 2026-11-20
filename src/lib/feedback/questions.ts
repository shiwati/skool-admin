/**
 * A két visszajelző Google Form kérdéskatalógusa. A sheet oszlopait a
 * fejléc kulcsszavai alapján ismerjük fel (a sorszám és a pontos
 * megfogalmazás változhat), és stabil kulcs alá tesszük a `Feedback.answers`
 * JSON-ban. Kliensről is importálható (nincs benne `server-only`).
 */

export type FeedbackRoleKey = "PARTICIPANT" | "MENTOR";

export type QuestionKind =
	/** 1–5 skála */
	| "scale"
	/** Szabad szöveg (ebben keres a lista) */
	| "text"
	/** Választós válasz (Igen/Lehet/Nem, településtípus…) */
	| "choice"
	/** Születési év */
	| "year";

export type Question = {
	key: string;
	/** Rövid felirat a részletnézetben. */
	label: string;
	kind: QuestionKind;
	/** Szakasz a részletnézetben. */
	section: "rating" | "text" | "statement" | "profile";
	/** Fordított állítás: az 1 a „jó” válasz (pl. „A programozás ijesztő.”). */
	reversed?: boolean;
	/** Igaz, ha a kérdés nélkül a sheet nem importálható. */
	required?: boolean;
	/** A normalizált (kisbetűs) fejlécre illeszkedik-e. */
	match: (header: string) => boolean;
};

const has =
	(...words: string[]) =>
	(h: string) =>
		words.some((w) => h.includes(w));
const all =
	(...words: string[]) =>
	(h: string) =>
		words.every((w) => h.includes(w));

/** Az időbélyeg oszlop mindkét űrlapon. */
export const isTimestampHeader = has("időbélyeg", "timestamp");

/** Az ajánlási kérdés mindkét űrlapon (az eredeti űrlapokon még nem szerepelt). */
const RECOMMEND: Question = {
	key: "recommend",
	label: "Ajánlaná másoknak",
	kind: "choice",
	section: "rating",
	match: has("ajánlanád", "ajánlaná"),
};

/**
 * Sorrendfüggő: az első illeszkedő kérdés nyer, és egy kérdés csak egy
 * oszlopot kaphat, ezért a szűkebb szabályok állnak elöl.
 */
export const PARTICIPANT_QUESTIONS: Question[] = [
	RECOMMEND,
	// Attitűd-állítások (1–5, mennyire értesz egyet)
	{
		key: "s01KnowsTechJobs",
		label: "Van elképzelésem, milyen munkája lehet egy tech cégnél dolgozónak.",
		kind: "scale",
		section: "statement",
		match: has("némi elképzelés", "számítástechnikai cégnél"),
	},
	{
		key: "s02HeardCareers",
		label: "Hallottam a workshopon a tech karrierlehetőségekről.",
		kind: "scale",
		section: "statement",
		match: has("karrierlehetőség"),
	},
	{
		key: "s03InterestedInTech",
		label: "Nagyon érdekel a tech terület.",
		kind: "scale",
		section: "statement",
		match: has("nagyon érdekel a tech"),
	},
	{
		key: "s04ProgrammingForBoys",
		label: "A programozás a fiúknak való.",
		kind: "scale",
		section: "statement",
		reversed: true,
		match: has("fiúknak való"),
	},
	{
		key: "s05TechOpenForGirls",
		label: "A tech terület nyitott a lányok számára is.",
		kind: "scale",
		section: "statement",
		match: has("nyitott a lányok"),
	},
	{
		key: "s06AppMakingExciting",
		label: "Az appkészítés és a vibe coding nagyon izgalmas.",
		kind: "scale",
		section: "statement",
		match: has("vibe coding", "appkészítés"),
	},
	{
		key: "s07ProgrammingScary",
		label: "A programozás ijesztő.",
		kind: "scale",
		section: "statement",
		reversed: true,
		match: has("ijesztő"),
	},
	{
		key: "s08CanLearnProgramming",
		label: "Képesnek érzem magam, hogy megtanuljak programozni.",
		kind: "scale",
		section: "statement",
		match: has("képesnek érzem"),
	},
	{
		key: "s09AsksInMath",
		label: "Merek kérdezni matekórán.",
		kind: "scale",
		section: "statement",
		match: has("matek órán", "matekórán"),
	},
	{
		key: "s10StartsProgrammingTask",
		label: "Bátran nekikezdek egy programozós feladatnak.",
		kind: "scale",
		section: "statement",
		match: has("programozós feladat"),
	},
	{
		key: "s11ImaginesTechJob",
		label: "El tudom képzelni, hogy IT-s / tech munkám legyen.",
		kind: "scale",
		section: "statement",
		match: has("el tudom képzelni"),
	},
	{
		key: "s12MeetSkoolees",
		label: "Szívesen találkoznék még Skooleekkal.",
		kind: "scale",
		section: "statement",
		match: has("találkoznék"),
	},
	{
		key: "s13LikeMindedGirls",
		label: "Fontos, hogy ismerjek hasonló érdeklődésű lányokat.",
		kind: "scale",
		section: "statement",
		match: has("hasonló érdeklődésű"),
	},
	{
		key: "s14BelongsToCommunity",
		label: "Skooleeként egy közösséghez tartozom.",
		kind: "scale",
		section: "statement",
		match: has("közösséghez tartozom"),
	},
	{
		key: "s15SkooleeIsCool",
		label: "Skooleenak lenni menő.",
		kind: "scale",
		section: "statement",
		match: has("menő"),
	},
	// Értékelések
	{
		key: "mentorRating",
		label: "Mentorok segítőkészsége",
		kind: "scale",
		section: "rating",
		required: true,
		match: (h) =>
			h.includes("mentorok") && has("értékeld", "segítőkész")(h),
	},
	{
		key: "instructorImprove",
		label: "Mit végezhetne jobban az oktató?",
		kind: "text",
		section: "text",
		match: all("oktató", "jobban"),
	},
	{
		key: "instructorRating",
		label: "Oktató érthetősége",
		kind: "scale",
		section: "rating",
		required: true,
		match: (h) => h.includes("oktató") && has("értékeld", "érthető")(h),
	},
	{
		key: "interestChange",
		label: "Mennyit változott az érdeklődése a tech iránt",
		kind: "scale",
		section: "rating",
		match: has("mennyiben változott"),
	},
	{
		key: "wouldStudyIt",
		label: "Informatikai továbbtanulást választana",
		kind: "choice",
		section: "rating",
		match: has("továbbtanul"),
	},
	// Szöveges válaszok
	{
		key: "feeling",
		label: "Hogy érezte magát?",
		kind: "text",
		section: "text",
		match: has("hogy érezted magad"),
	},
	{
		key: "favoriteTopic",
		label: "Kedvenc téma, rész",
		kind: "text",
		section: "text",
		match: has("kedvenc"),
	},
	{
		key: "wishTopic",
		label: "Miről tanulna még szívesen?",
		kind: "text",
		section: "text",
		match: has("foglalkoztál volna", "tanulnál róla"),
	},
	{
		key: "messageToMentor",
		label: "Üzenet a mentornak",
		kind: "text",
		section: "text",
		match: has("mentorodnak"),
	},
	{
		key: "messageToGirls",
		label: "Üzenet azoknak, akik még nem jártak Skoolon",
		kind: "text",
		section: "text",
		match: has("nem jártak még"),
	},
	{
		key: "otherComment",
		label: "Egyéb megosztanivaló",
		kind: "text",
		section: "text",
		match: has("megosztanál"),
	},
	// Profil (anonim)
	{
		key: "firstTime",
		label: "Első Skool foglalkozása",
		kind: "choice",
		section: "profile",
		match: has("első skool"),
	},
	{
		key: "birthYear",
		label: "Születési év",
		kind: "year",
		section: "profile",
		match: has("születtél", "születési év"),
	},
	{
		key: "settlement",
		label: "Település típusa",
		kind: "choice",
		section: "profile",
		match: has("településen", "település"),
	},
];

export const MENTOR_QUESTIONS: Question[] = [
	RECOMMEND,
	{
		key: "overallRating",
		label: "A műhelyfoglalkozás összességében",
		kind: "scale",
		section: "rating",
		required: true,
		match: has("egészében"),
	},
	{
		key: "wouldMentorAgain",
		label: "Mentorálna újra",
		kind: "scale",
		section: "rating",
		match: (h) => h.includes("mentorként") && has("újabb", "újra")(h),
	},
	{
		key: "highlight",
		label: "A nap fénypontja",
		kind: "text",
		section: "text",
		match: has("fénypont"),
	},
	{
		key: "leastLiked",
		label: "Ami a legkevésbé tetszett",
		kind: "text",
		section: "text",
		match: has("legkevésbé"),
	},
	{
		key: "skoolSupport",
		label: "Hogyan segíthetné jobban a Skool a mentorokat?",
		kind: "text",
		section: "text",
		match: has("hogyan tudná a skool", "segíteni a mentorok"),
	},
	{
		key: "mentorsImprove",
		label: "Mit végezhetnének jobban a mentorok?",
		kind: "text",
		section: "text",
		match: all("mentorok", "jobban"),
	},
	{
		key: "motivation",
		label: "Mi motiválta a részvételben?",
		kind: "text",
		section: "text",
		match: has("motivált"),
	},
	{
		key: "otherComment",
		label: "Egyéb megosztanivaló",
		kind: "text",
		section: "text",
		match: has("megosztanál"),
	},
];

export const QUESTIONS: Record<FeedbackRoleKey, Question[]> = {
	PARTICIPANT: PARTICIPANT_QUESTIONS,
	MENTOR: MENTOR_QUESTIONS,
};

/** Az időbélyeg oszlop kulcsa a mentett megfeleltetésben. */
export const TIMESTAMP_KEY = "timestamp";

/** Eventenként felvett kérdés; a válasz `custom:<felirat>` kulcs alá kerül. */
export type CustomQuestion = {
	label: string;
	kind: "scale" | "text" | "choice";
	/** A sheet pontos fejléce. */
	header: string;
};

export const CUSTOM_KIND_LABELS: Record<CustomQuestion["kind"], string> = {
	scale: "1–5 skála",
	text: "Szöveg",
	choice: "Választós",
};

export const CUSTOM_KEY_PREFIX = "custom:";

export const customQuestionKey = (label: string) =>
	`${CUSTOM_KEY_PREFIX}${label.trim()}`;

/**
 * Eventenként mentett megfeleltetés: kérdéskulcs (vagy `timestamp`) → a sheet
 * pontos fejléce, plusz egyéni kérdések. `null` = alapértelmezett.
 */
export type FeedbackSheetMapping = {
	columns: Record<string, string>;
	custom: CustomQuestion[];
};

export function toQuestion(custom: CustomQuestion): Question {
	return {
		key: customQuestionKey(custom.label),
		label: custom.label.trim(),
		kind: custom.kind,
		section: "text",
		match: () => false,
	};
}

export const ROLE_LABELS: Record<FeedbackRoleKey, string> = {
	PARTICIPANT: "Résztvevő",
	MENTOR: "Mentor",
};

export type Recommend = "yes" | "maybe" | "no";

export const RECOMMEND_LABELS: Record<Recommend, string> = {
	yes: "Igen",
	maybe: "Talán",
	no: "Nem",
};
