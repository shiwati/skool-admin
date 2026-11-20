import { PARTICIPANT_QUESTIONS } from "@/lib/feedback/questions";

/**
 * „A hatás számokban”: a résztvevői visszajelzésekből számolt arányok.
 * Skálás kérdésnél a 4–5 (fordított állításnál az 1–2) válaszok, az
 * ajánlásnál az „igen” válaszok aránya a kérdésre válaszolók között.
 */

export type MetricDefinition = {
	key: string;
	/** Rövid felirat az appban. */
	label: string;
	/** A riport csempéjén a százalék alatti szöveg („100%” + phrase). */
	phrase: string;
};

export const METRICS: MetricDefinition[] = [
	{
		key: "mentorRating",
		label: "A mentorok segítségét 4–5-re értékelte",
		phrase: "4–5-re értékelte a mentorok segítségét (ötfokú skálán)",
	},
	{
		key: "instructorRating",
		label: "Az oktató munkáját 4–5-re értékelte",
		phrase: "4–5-re értékelte az oktató munkáját (ötfokú skálán)",
	},
	{
		key: "s05TechOpenForGirls",
		label: "A tech terület nyitott a lányok előtt",
		phrase: "szerint a tech terület nyitott a lányok előtt",
	},
	{
		key: "s04ProgrammingForBoys",
		label: "A programozás nem csak a fiúknak való",
		phrase: "szerint a programozás nem csak a fiúknak való",
	},
	{
		key: "s08CanLearnProgramming",
		label: "Képesnek érzi magát a programozás tanulására",
		phrase: "képesnek érzi magát arra, hogy megtanuljon programozni",
	},
	{
		key: "s06AppMakingExciting",
		label: "Az appkészítés izgalmas",
		phrase: "szerint az appkészítés és a programozás izgalmas",
	},
	{
		key: "s07ProgrammingScary",
		label: "A programozás nem ijesztő",
		phrase: "szerint a programozás nem ijesztő",
	},
	{
		key: "s10StartsProgrammingTask",
		label: "Bátran nekikezd egy programozós feladatnak",
		phrase: "bátran nekikezd egy programozós feladatnak",
	},
	{
		key: "s11ImaginesTechJob",
		label: "El tudja képzelni, hogy tech munkája legyen",
		phrase: "el tudja képzelni, hogy IT-s / tech munkája legyen",
	},
	{
		key: "s03InterestedInTech",
		label: "Érdekli a tech terület",
		phrase: "nagyon érdeklődik a tech terület iránt",
	},
	{
		key: "recommend",
		label: "Ajánlaná másoknak",
		phrase: "ajánlaná a workshopot másoknak is",
	},
	{
		key: "s12MeetSkoolees",
		label: "Szívesen találkozna még Skooleekkal",
		phrase: "szívesen találkozna még Skooleekkal",
	},
	{
		key: "s13LikeMindedGirls",
		label: "Fontos, hogy hasonló érdeklődésű lányokat ismerjen",
		phrase: "fontosnak tartja, hogy hasonló érdeklődésű lányokat ismerjen",
	},
	{
		key: "s15SkooleeIsCool",
		label: "Skooleenak lenni menő",
		phrase: "szerint Skooleenak lenni menő",
	},
];

const REVERSED = new Set(
	PARTICIPANT_QUESTIONS.filter((q) => q.reversed).map((q) => q.key),
);

export type MetricInput = {
	answers: Record<string, unknown>;
	recommend: string | null;
};

export type MetricResult = MetricDefinition & {
	/** 0–100 egészre kerekítve; `null`, ha senki nem válaszolt. */
	percent: number | null;
	answered: number;
};

function isPositive(key: string, input: MetricInput): boolean | null {
	if (key === "recommend") {
		return input.recommend === null ? null : input.recommend === "yes";
	}
	const value = input.answers[key];
	if (typeof value !== "number" || value < 1 || value > 5) return null;
	return REVERSED.has(key) ? value <= 2 : value >= 4;
}

export function computeMetrics(inputs: MetricInput[]): MetricResult[] {
	return METRICS.map((metric) => {
		let answered = 0;
		let positive = 0;
		for (const input of inputs) {
			const result = isPositive(metric.key, input);
			if (result === null) continue;
			answered += 1;
			if (result) positive += 1;
		}
		return {
			...metric,
			answered,
			percent:
				answered === 0 ? null : Math.round((positive / answered) * 100),
		};
	});
}
