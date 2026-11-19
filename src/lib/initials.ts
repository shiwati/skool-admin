/**
 * Monogram egy megjelenített névből (pl. "Kovács Anna" → "KA").
 * Legfeljebb két betű: az első és az utolsó szó kezdőbetűje.
 */
export function initials(name: string | null | undefined): string {
	const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	const first = words[0];
	const last = words.length > 1 ? words[words.length - 1] : "";
	return (first.charAt(0) + last.charAt(0)).toLocaleUpperCase("hu-HU");
}
