import { describe, expect, it } from "vitest";
import {
	mapFeedbackHeaders,
	overallScore,
	parseFeedbackRow,
	parseRecommend,
	parseScale,
} from "./parse";
import { MENTOR_QUESTIONS, PARTICIPANT_QUESTIONS } from "./questions";

// A valós (2026. novemberi) űrlapok fejlécei, ahogy a sheetben szerepelnek.
const PARTICIPANT_HEADERS = [
	"Időbélyeg",
	"1. Hogy érezted magad a Skool foglalkozáson?",
	"2. Melyik volt a kedvenc témád, részed a műhelyfoglalkozás alatt? Miért? ",
	"3. Van-e olyan téma, amivel szívesen foglalkoztál volna többet, vagy esetleg nem volt a napirenden, de tanulnál róla mindenképpen a jövőben? ",
	'4. Szerinted milyenek voltak a "mentorok"? Kérjük értékeld, mennyire voltak segítőkészek!',
	"5. Szerinted milyen volt a foglalkozást vezető oktató, Fruzsi? Kérjük értékeld mennyire volt érthető?",
	"6. Szerinted van-e valami, amit az oktató, Fruzsi, jobban is végezhetne a következő műhelyfoglalkozás alkalmával?",
	"8. Mennyiben változott a technológiai oktatás és tanulmányok iránt az érdeklődésed a műhelyfoglalkozás után? ",
	"9. Ha most kellene döntened, hogy milyen irányú tanulmányokra jelentkezz, akkor választanád-e az informatikai területen való továbbtanulást? ",
	"10. Van-e még esetleg bármi, amit megosztanál velünk? :-)",
	"11. Üzenet a mentorodnak! :-)",
	"12. Mit üzennél azoknak a lányoknak, akik nem jártak még Skool foglalkozáson?",
	"13. Ez volt az első Skool foglalkozásod?",
	"1. Van már némi elképzelésem, hogy milyen munkája lehet egy számítástechnikai cégnél dolgozó kollégának.",
	"2. Hallotam róla a workshopon, hogy milyen karrierlehetőségek vannak a tech szektorban.",
	"3. Nagyon érdekel a tech terület.",
	"4. A programozás a fiúknak való. ",
	"5. A tech terület nyitott a lányok számára is.",
	"6. Az appkészítés és a vibe coding nagyon izgalmas.",
	"7. A programozás ijesztő.",
	"8. Képesnek érzem magam arra, hogy megtanuljak programozni.",
	"9. Merek kérdezni matek órán.",
	"10. Bátran nekikezdek egy programozós feladatnak. ",
	"11. El tudom képzelni, hogy valamilyen IT-s / tech munkám legyen. ",
	"12. Szívesen találkoznék még Skooleekkal.",
	"13. Fontos számomra, hogy ismerjek hasonló érdeklődésű lányokat.",
	"14. Skooleeként egy közösséghez tartozom.",
	"15. Skooleenak lenni menő.",
	"16. Melyik évben születtél?",
	"17. Milyen településen laksz?",
];

const PARTICIPANT_ROW = [
	46333.79144,
	"Nagyon jól!",
	"Az AI-os játékgenerálás.",
	"App készítéssel szívesen foglalkoznék többet.",
	5,
	4,
	"Kicsit tömörebben lehetett volna.",
	4,
	"Lehet",
	"Legközelebb is szívesen megyek :)",
	"Köszönöm a segítségedet!",
	"Próbálják ki, mert megéri.",
	"nem",
	4,
	5,
	4,
	3,
	5,
	5,
	2,
	4,
	3,
	4,
	4,
	5,
	5,
	4,
	4,
	2015,
	"főváros",
];

const MENTOR_HEADERS = [
	"Időbélyeg",
	"Milyennek ítéled meg egészében a műhelyfoglalkozást? Kérjük értékeld a műhelyfoglalkozást 1-től 5-ig terjedő skálán. ",
	"Mi volt a nap fénypontja? Mi volt a legjobb pillanatod? Mit élveztél a leginkább?",
	"Mi az, ami a legkevésbé tetszett? ",
	"Szerinted hogyan tudná a Skool még inkább segíteni a mentorok munkáját a foglalkozás alatt?",
	"Szerinted van-e valami, amit ti, mentorok jobban is végezhetnétek a következő műhelyfoglalkozás alkalmával? ",
	"Mi vagy ki motivált abban, hogy részt vegyél a műhelyfoglalkozáson? ",
	"Szívesen részt vennél egy újabb műhelyfoglalkozáson mentorként? ",
	"Van-e még esetleg bármi, amit megosztanál velünk? :-)",
];

describe("mapFeedbackHeaders", () => {
	it("maps every column of the participant form", () => {
		const mapping = mapFeedbackHeaders("PARTICIPANT", PARTICIPANT_HEADERS);
		expect(mapping.timestamp).toBe(0);
		expect(mapping.unmapped).toEqual([]);
		expect(mapping.missingRequired).toEqual([]);
		// Every catalog question except the new "recommend" one has a column.
		const expected = PARTICIPANT_QUESTIONS.filter(
			(q) => q.key !== "recommend",
		).length;
		expect(Object.keys(mapping.columns)).toHaveLength(expected);
		expect(mapping.columns).toMatchObject({
			feeling: 1,
			favoriteTopic: 2,
			wishTopic: 3,
			mentorRating: 4,
			instructorRating: 5,
			instructorImprove: 6,
			interestChange: 7,
			wouldStudyIt: 8,
			otherComment: 9,
			messageToMentor: 10,
			messageToGirls: 11,
			firstTime: 12,
			s01KnowsTechJobs: 13,
			s04ProgrammingForBoys: 16,
			s07ProgrammingScary: 19,
			s15SkooleeIsCool: 27,
			birthYear: 28,
			settlement: 29,
		});
	});

	it("maps every column of the mentor form", () => {
		const mapping = mapFeedbackHeaders("MENTOR", MENTOR_HEADERS);
		expect(mapping.unmapped).toEqual([]);
		expect(mapping.missingRequired).toEqual([]);
		expect(mapping.columns).toEqual({
			overallRating: 1,
			highlight: 2,
			leastLiked: 3,
			skoolSupport: 4,
			mentorsImprove: 5,
			motivation: 6,
			wouldMentorAgain: 7,
			otherComment: 8,
		});
		expect(Object.keys(mapping.columns)).toHaveLength(
			MENTOR_QUESTIONS.length - 1,
		);
	});

	it("recognises the new recommend question", () => {
		const mapping = mapFeedbackHeaders("MENTOR", [
			...MENTOR_HEADERS,
			"Ajánlanád másoknak, hogy mentoráljanak a Skoolban?",
		]);
		expect(mapping.columns.recommend).toBe(9);
	});

	it("reports missing required columns", () => {
		expect(
			mapFeedbackHeaders("PARTICIPANT", ["Valami"]).missingRequired,
		).toEqual([
			"Időbélyeg",
			"Mentorok segítőkészsége",
			"Oktató érthetősége",
		]);
		// The participant sheet is not a valid mentor sheet.
		expect(
			mapFeedbackHeaders("MENTOR", PARTICIPANT_HEADERS).missingRequired,
		).toContain("A műhelyfoglalkozás összességében");
	});
});

/** A sikeres eredményre szűkít (különben a teszt elbukik). */
function parsedOk(result: ReturnType<typeof parseFeedbackRow>) {
	if (result.ok !== true)
		throw new Error(`not parsed: ${JSON.stringify(result)}`);
	return result;
}

describe("parseFeedbackRow", () => {
	const mapping = mapFeedbackHeaders("PARTICIPANT", PARTICIPANT_HEADERS);

	it("turns a participant response into answers and summary fields", () => {
		const parsed = parseFeedbackRow(
			"PARTICIPANT",
			PARTICIPANT_ROW,
			mapping,
			"Europe/Budapest",
		);
		expect(parsed.ok).toBe(true);
		if (parsed.ok !== true) return;
		expect(parsed.answers).toMatchObject({
			mentorRating: 5,
			instructorRating: 4,
			wouldStudyIt: "Lehet",
			firstTime: "nem",
			s04ProgrammingForBoys: 3,
			birthYear: 2015,
			settlement: "főváros",
		});
		expect(parsed.overallScore).toBe(4.5);
		expect(parsed.recommend).toBeNull();
		expect(parsed.sourceKey).toBe("46333.79144#0");
		// 18:59 Budapest time (CET) is 17:59 UTC.
		expect(parsed.submittedAt?.toISOString()).toMatch(
			/^2026-11-07T17:59:4/,
		);
		expect(parsed.searchText).toContain("ai-os játékgenerálás");
		expect(parsed.searchText).not.toContain("főváros");
	});

	it("keeps same-second responses apart by occurrence", () => {
		const a = parseFeedbackRow(
			"PARTICIPANT",
			PARTICIPANT_ROW,
			mapping,
			"UTC",
			0,
		);
		const b = parseFeedbackRow(
			"PARTICIPANT",
			PARTICIPANT_ROW,
			mapping,
			"UTC",
			1,
		);
		expect(parsedOk(a).sourceKey).not.toBe(parsedOk(b).sourceKey);
	});

	it("skips empty rows and rejects rows without answers", () => {
		expect(
			parseFeedbackRow("PARTICIPANT", ["", null], mapping, "UTC").ok,
		).toBe("empty");
		expect(
			parseFeedbackRow("PARTICIPANT", [46333.5, "-"], mapping, "UTC"),
		).toEqual({ ok: false, reason: "Nincs értelmezhető válasz" });
	});

	it("drops placeholder dashes but keeps real text answers", () => {
		const mentorMapping = mapFeedbackHeaders("MENTOR", MENTOR_HEADERS);
		const parsed = parseFeedbackRow(
			"MENTOR",
			[
				46336.6,
				5,
				"Jól szervezett nap.",
				"-",
				"-",
				"-",
				"Segíteni akarás.",
				5,
				"-",
			],
			mentorMapping,
			"UTC",
		);
		expect(parsedOk(parsed).answers).toEqual({
			overallRating: 5,
			highlight: "Jól szervezett nap.",
			motivation: "Segíteni akarás.",
			wouldMentorAgain: 5,
		});
		expect(parsedOk(parsed).overallScore).toBe(5);
	});
});

describe("value parsers", () => {
	it("parses 1–5 scales", () => {
		expect(parseScale(4)).toBe(4);
		expect(parseScale("5 - nagyon")).toBe(5);
		expect(parseScale(6)).toBeNull();
		expect(parseScale(4.5)).toBeNull();
		expect(parseScale("")).toBeNull();
	});

	it("normalises recommend answers", () => {
		expect(parseRecommend("Igen")).toBe("yes");
		expect(parseRecommend("Lehet")).toBe("maybe");
		expect(parseRecommend("Talán")).toBe("maybe");
		expect(parseRecommend("nem")).toBe("no");
		expect(parseRecommend("valami")).toBeNull();
	});

	it("averages the participant's mentor and instructor ratings", () => {
		expect(overallScore("PARTICIPANT", { mentorRating: 5 })).toBe(5);
		expect(
			overallScore("PARTICIPANT", {
				mentorRating: 4,
				instructorRating: 5,
			}),
		).toBe(4.5);
		expect(overallScore("MENTOR", {})).toBeNull();
	});

	it("uses the mentor's own overall rating", () => {
		expect(overallScore("MENTOR", { overallRating: 4 })).toBe(4);
		// Participant ratings on a mentor response are ignored.
		expect(
			overallScore("MENTOR", { mentorRating: 5, instructorRating: 5 }),
		).toBeNull();
		expect(overallScore("PARTICIPANT", { overallRating: 4 })).toBeNull();
	});
});
