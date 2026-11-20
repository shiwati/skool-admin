import "server-only";
import { db } from "@/lib/db";

export type TagOption = { name: string; count: number };

const collator = new Intl.Collator("hu", { sensitivity: "base" });

/**
 * A programokon használt címkék, és hány program használja őket: a
 * legtöbbet használt elöl, azonos számnál magyar ábécérendben. Nincs külön
 * címketábla; a nem használt címke nem szerepel.
 */
export async function listTagOptions(): Promise<TagOption[]> {
	const rows = await db.$queryRaw<{ name: string; count: bigint | number }[]>`
		SELECT tag AS name, count(*) AS count
		FROM event, unnest(tags) AS tag
		GROUP BY tag
	`;
	return rows
		.map((row) => ({ name: row.name, count: Number(row.count) }))
		.sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));
}
