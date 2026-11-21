/**
 * A jelentkező és a jelentkezés mezőinek közös magyar felirata: ezt használja
 * a változástörténet, a duplikáció-összehasonlító és a sheet-oszlopok
 * megfeleltetése. Kliensről is importálható (nincs benne `server-only`).
 *
 * Az űrlapok szekción belül rövidebb feliratot használhatnak (pl. a
 * szerkesztő „Szülő / gondviselő” szekciójában „Anyja neve”).
 */
export const FIELD_LABELS = {
	lastName: "Vezetéknév",
	firstName: "Keresztnév",
	email: "E-mail",
	birthYear: "Születési év",
	schoolName: "Iskola",
	hometown: "Település",
	phoneNumber: "Telefon",
	parentLastName: "Szülő vezetékneve",
	parentFirstName: "Szülő keresztneve",
	parentMothersName: "Szülő anyja neve",
	parentAddress: "Szülő címe",
	parentEmail: "Szülő e-mail",
	parentPhone: "Szülő telefon",
	newsletter: "Hírlevél",
	foodPreference: "Étkezési igény",
	heardFromWhere: "Honnan hallott rólunk",
	heardFromWhom: "Kitől hallott rólunk",
	solvedProblem: "Megoldandó probléma",
	pastExpInProg: "Programozási tapasztalat",
	pastParticipationOther: "Más programok",
	pastParticipationSkool: "Korábbi Skool részvétel",
	pastParticipationSkoolDesc: "Korábbi Skool program",
	companyAwareness: "Ismeri a partnercéget",
	comment: "Megjegyzés",
} as const;
