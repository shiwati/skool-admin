import { z } from "zod";

/**
 * Programcímkék szabályai. Nincs fix lista: a választható címkék a
 * programokon használt címkék (`GET /api/events/tags`), újat a program
 * űrlapján lehet felvenni. Ugyanez a normalizálás fut a böngészőben és a
 * szerveren (űrlap, végpontok, listaszűrő, seed).
 *
 * Kliensről is importálható (nincs benne `server-only` és Prisma).
 */

export const TAG_MAX_LENGTH = 30;

/** Szélek levágása, belső szóközök összevonása, kisbetű (magyar szabályokkal). */
export function normalizeTag(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("hu");
}

/**
 * Kis- és nagybetűt, valamint ékezetet figyelmen kívül hagyó kulcs: a
 * keresésnek és a majdnem azonos címkék felismerésének.
 */
export function searchKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("hu");
}

/** Üres, ha a (normalizált) címke érvényes; különben a hibaüzenet. */
export function tagError(tag: string): string | null {
	if (tag.length === 0) return "A címke nem lehet üres.";
	if (tag.length > TAG_MAX_LENGTH) {
		return `A címke legfeljebb ${TAG_MAX_LENGTH} karakter lehet.`;
	}
	if (tag.includes(",")) return "A címke nem tartalmazhat vesszőt.";
	return null;
}

/** Egy címke: normalizálja, majd ellenőrzi. */
export const tagSchema = z
	.string()
	.transform(normalizeTag)
	.superRefine((tag, ctx) => {
		const message = tagError(tag);
		if (message) ctx.addIssue({ code: "custom", message });
	});

/** Egy program címkéi: normalizálva, ismétlődés nélkül, az első előfordulás sorrendjében. */
export const tagListSchema = z
	.array(tagSchema)
	.transform((tags) => [...new Set(tags)]);
