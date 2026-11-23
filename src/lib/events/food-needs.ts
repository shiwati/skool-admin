/**
 * Egy program étkezési igényei: a jelentkezők szabad szöveges válaszából.
 * Tiszta függvények (kliensről is importálhatók); a lekérdezés a
 * `food-needs-load.ts`-ben van.
 */

export const FOOD_NEED_STATUSES = ["ATTENDED", "ACCEPTED", "APPLIED"] as const;
export type FoodNeedStatus = (typeof FOOD_NEED_STATUSES)[number];

export type FoodNeedRow = {
	status: string;
	foodPreference: string | null;
	applicant: {
		id: string;
		firstName: string;
		lastName: string;
		deletedAt: Date | null;
	};
};

export type FoodNeedEntry = {
	applicantId: string;
	name: string;
	answer: string;
};

export type FoodNeedGroup = {
	status: FoodNeedStatus;
	/** Válasz, majd név szerint rendezve. */
	rows: FoodNeedEntry[];
};

export type FoodNeeds = {
	/** A kártya által lefedett jelentkezők száma (mind a három státuszban). */
	covered: number;
	/** Akinek nincs étkezési igénye (üres vagy „nincs” jellegű válasz). */
	unrestricted: number;
	/** Csak a van igényű jelentkezőket tartalmazó csoportok. */
	groups: FoodNeedGroup[];
};

// Pontos lista, nem „nem/nincs-sel kezdődik”: a kimaradt „nem” csak egy
// felesleges sort jelent, de a „nem eszik húst” nem veszhet el a darabszámban.
const NO_RESTRICTION = new Set([
	"nem",
	"nincs",
	"nincsen",
	"semmi",
	"nem van",
	"nincs ilyen",
	"nincs semmi",
	"nem vagyok erzekeny",
	"nincs megkotes",
	"nincs allergiam",
	"nincs erzekenysegem",
	"nem nincs",
	"n a",
	"na",
	"none",
	"no",
]);

/** Kis- és nagybetű, ékezet és írásjel nélküli alak az összehasonlításhoz. */
function fold(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/** Üres, csak írásjeleket tartalmazó („-”) vagy ismert „nincs” válasz. */
export function hasNoFoodRestriction(answer: string | null): boolean {
	if (answer === null) return true;
	const folded = fold(answer);
	return folded === "" || NO_RESTRICTION.has(folded);
}

/**
 * Az étkezési igények státuszcsoportonként. Az elutasított, lemondott és
 * várólistás jelentkezések, valamint az anonimizált jelentkezők kimaradnak; akinek több
 * jelentkezése van, az első csoportjában szerepel egyszer. A csoporton belül
 * a válasz (kis- és nagybetű, ékezet nélkül), majd a név a sorrend, hogy az
 * azonos igények egymás alá kerüljenek és könnyen összeszámolhatók legyenek.
 */
export function foodNeeds(rows: FoodNeedRow[]): FoodNeeds {
	const seen = new Set<string>();
	const groups: FoodNeedGroup[] = [];
	let unrestricted = 0;
	for (const status of FOOD_NEED_STATUSES) {
		const entries: (FoodNeedEntry & { key: string })[] = [];
		for (const row of rows) {
			const { applicant } = row;
			if (
				row.status !== status ||
				applicant.deletedAt !== null ||
				seen.has(applicant.id)
			)
				continue;
			seen.add(applicant.id);
			if (hasNoFoodRestriction(row.foodPreference)) {
				unrestricted += 1;
				continue;
			}
			const answer = row.foodPreference!.trim();
			entries.push({
				applicantId: applicant.id,
				name: `${applicant.lastName} ${applicant.firstName}`.trim(),
				answer,
				key: fold(answer),
			});
		}
		entries.sort(
			(a, b) =>
				a.key.localeCompare(b.key, "hu") ||
				a.name.localeCompare(b.name, "hu"),
		);
		if (entries.length > 0)
			groups.push({
				status,
				rows: entries.map(({ applicantId, name, answer }) => ({
					applicantId,
					name,
					answer,
				})),
			});
	}
	return { covered: seen.size, unrestricted, groups };
}
