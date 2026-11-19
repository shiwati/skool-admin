/**
 * Duplikátumpárok képzése. Tiszta függvények, kliensről is importálható
 * (nincs benne `server-only` és Prisma).
 */

export type DuplicateCandidate = {
	id: string;
	duplicateKey: string;
	createdAt: Date;
};

/** Rendezett pár: a korábban létrehozott jelentkező az `aId`. */
export type DuplicatePairRef = { aId: string; bId: string };

/** Egy pár kulcsa sorrendtől függetlenül (a kisebb id elöl). */
export function pairKey(x: string, y: string): string {
	return x < y ? `${x}|${y}` : `${y}|${x}`;
}

function byAge(a: DuplicateCandidate, b: DuplicateCandidate): number {
	return (
		a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1)
	);
}

/**
 * Az azonos kulcsú jelentkezők összes párja, kivéve a "nem duplikáció"
 * döntéssel elvetetteket. Determinisztikus sorrend: a csoportok a
 * legrégebbi tagjuk szerint, a párok azon belül létrehozási idő szerint.
 */
export function buildDuplicatePairs(
	candidates: readonly DuplicateCandidate[],
	dismissed: ReadonlySet<string>,
): DuplicatePairRef[] {
	const groups = new Map<string, DuplicateCandidate[]>();
	for (const c of candidates) {
		const group = groups.get(c.duplicateKey);
		if (group) group.push(c);
		else groups.set(c.duplicateKey, [c]);
	}
	const sorted = [...groups.values()]
		.map((g) => g.toSorted(byAge))
		.sort((g, h) => byAge(g[0], h[0]));

	const pairs: DuplicatePairRef[] = [];
	for (const group of sorted) {
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i];
				const b = group[j];
				if (!dismissed.has(pairKey(a.id, b.id))) {
					pairs.push({ aId: a.id, bId: b.id });
				}
			}
		}
	}
	return pairs;
}
