/** A meglévő címkék rögzített háttérszíne (kliensről is importálható). */
export const TAG_CLASSES: Record<string, string> = {
	robotika: "bg-sky",
	programozás: "bg-lavender",
	kezdő: "bg-sage",
	haladó: "bg-peach",
};

/** A többi címke ebből a palettából kap színt (a szürke nincs benne). */
export const TAG_PALETTE = [
	"bg-sky",
	"bg-lavender",
	"bg-sage",
	"bg-peach",
	"bg-pink",
] as const;

/** FNV-1a: kicsi, determinisztikus, szerveren és böngészőben ugyanaz. */
function hash(value: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * Címke → háttérszín: a négy meglévő címke rögzített színt kap, minden más
 * címke a nevéből számolt palettaszínt, így ugyanaz a címke mindenhol
 * ugyanolyan színű, tárolás nélkül.
 */
export function tagClass(tag: string): string {
	return TAG_CLASSES[tag] ?? TAG_PALETTE[hash(tag) % TAG_PALETTE.length];
}

export const AVATAR_CLASSES = ["bg-pink-strong", "bg-pink"];
