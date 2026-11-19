/** Címke → háttérszín; ismeretlen címkénél `bg-surface-subtle` (kliensről is importálható). */
export const TAG_CLASSES: Record<string, string> = {
	robotika: "bg-sky",
	programozás: "bg-lavender",
	kezdő: "bg-sage",
	haladó: "bg-peach",
};

export function tagClass(tag: string): string {
	return TAG_CLASSES[tag] ?? "bg-surface-subtle";
}

export const AVATAR_CLASSES = ["bg-pink-strong", "bg-pink"];
