import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const MAX_PAGE_SIZE = 100;

export const paginationSchema = {
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
};

export const orderSchema = z.enum(["asc", "desc"]);

/**
 * Tömeges művelet azonosítói (törzsben): 1–`MAX_PAGE_SIZE` egyedi, nem üres
 * id, hogy a „mind kijelölése az oldalon” mindig beleférjen.
 */
export const idListSchema = z
	.array(z.string().trim().min(1).max(64))
	.min(1)
	.max(MAX_PAGE_SIZE)
	.refine((ids) => new Set(ids).size === ids.length, {
		message: "ids must be unique",
	});

/** Vesszővel elválasztott lista (`?a=x,y`) vagy ismételt paraméter (`?a=x&a=y`). */
export function csvList<T extends z.ZodType>(item: T) {
	return z.preprocess((value) => {
		if (value === undefined) return undefined;
		const raw = Array.isArray(value) ? value : [value];
		const parts = raw
			.flatMap((v) => String(v).split(","))
			.map((v) => v.trim())
			.filter(Boolean);
		return parts.length ? parts : undefined;
	}, z.array(item).optional());
}

/**
 * Csak ismételt paraméterként (`?a=x&a=y`) megadható lista, vesszőnél nem
 * vág: szabad szöveges értékekhez (pl. címkék), amelyekben lehet vessző.
 */
export function repeatedList<T extends z.ZodType>(item: T) {
	return z.preprocess((value) => {
		if (value === undefined) return undefined;
		const raw = Array.isArray(value) ? value : [value];
		const parts = [...new Set(raw.map((v) => String(v).trim()))].filter(
			Boolean,
		);
		return parts.length ? parts : undefined;
	}, z.array(item).optional());
}

export const booleanParam = z
	.enum(["true", "false", "1", "0"])
	.transform((v) => v === "true" || v === "1")
	.optional();

export const optionalText = z
	.string()
	.trim()
	.transform((v) => v || undefined)
	.optional();

/** URLSearchParams → objektum; az ismételt kulcsok tömbbé válnak. */
export function searchParamsToObject(params: URLSearchParams) {
	const result: Record<string, string | string[]> = {};
	for (const key of new Set(params.keys())) {
		const values = params.getAll(key);
		result[key] = values.length > 1 ? values : values[0];
	}
	return result;
}

/** Szavakra bontott keresés: minden szónak egyeznie kell legalább egy mezőben. */
export function searchTokens(q: string | undefined) {
	return q ? q.split(/\s+/).filter(Boolean) : [];
}

export function containsInsensitive(value: string) {
	return { contains: value, mode: "insensitive" as const };
}

/** Amit a `foldSearch` a Prisma kliensből használ (tesztben mockolható). */
export type FoldDb = Pick<PrismaClient, "$queryRaw">;

/**
 * A begépelt szűrőszövegek hajtogatása a keresőoszlopokéval azonos módon,
 * az adatbázisban: `lower(unaccent(…))` (lásd docs/data-and-db.md,
 * „Keresés”). Egy kérésben egyszer, a bemenet sorrendjében; üres listánál
 * nincs lekérdezés.
 */
export async function foldSearch(
	db: FoldDb,
	texts: readonly string[],
): Promise<string[]> {
	if (texts.length === 0) return [];
	const rows = await db.$queryRaw<{ folded: string }[]>`
		SELECT lower(public.unaccent(t)) AS folded
		FROM unnest(${[...texts]}::text[]) WITH ORDINALITY AS u(t, n)
		ORDER BY n`;
	return rows.map((row) => row.folded);
}

/**
 * Részszöveg-egyezés egy hajtogatott keresőoszlopon. Nem kell `mode`: mindkét
 * oldal már kisbetűs; a `%` és `_` jelet a Prisma escapeli.
 */
export function foldedContains(folded: string) {
	return { contains: folded };
}

/**
 * Életkor-tartomány → születési év tartomány.
 * Életkor ≈ aktuális év − születési év.
 */
export function ageRangeToBirthYear(
	ageFrom: number | undefined,
	ageTo: number | undefined,
	now = new Date(),
) {
	if (ageFrom === undefined && ageTo === undefined) return undefined;
	const year = now.getFullYear();
	return {
		...(ageFrom !== undefined && { lte: year - ageFrom }),
		...(ageTo !== undefined && { gte: year - ageTo }),
	};
}

/**
 * Egy naptári év határai Europe/Budapest időzónában.
 * Január 1-jén mindig téli idő (CET, UTC+1) van, így az eltolás fix.
 */
export function budapestYearRange(year: number) {
	const hour = 60 * 60 * 1000;
	return {
		gte: new Date(Date.UTC(year, 0, 1) - hour),
		lt: new Date(Date.UTC(year + 1, 0, 1) - hour),
	};
}

export function pageResult<T>(
	items: T[],
	total: number,
	page: number,
	pageSize: number,
) {
	return { items, total, page, pageSize };
}
