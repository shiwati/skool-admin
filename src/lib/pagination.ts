/** Megjelenítendő oldalszámok, a kihagyásokat `null` jelöli: 1 … 4 5 6 … 50. */
export function pageNumbers(
	page: number,
	pageCount: number,
): (number | null)[] {
	if (pageCount <= 7)
		return Array.from({ length: pageCount }, (_, i) => i + 1);
	const pages = new Set([1, pageCount, page - 1, page, page + 1]);
	const sorted = [...pages]
		.filter((p) => p >= 1 && p <= pageCount)
		.sort((a, b) => a - b);
	const result: (number | null)[] = [];
	for (const [i, p] of sorted.entries()) {
		if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
		result.push(p);
	}
	return result;
}
