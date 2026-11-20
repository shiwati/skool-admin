import { Prisma } from "@prisma/client";
import { SHEET_MAPPING_FIELDS } from "./changes";

type JsonField = (typeof SHEET_MAPPING_FIELDS)[number];

type JsonInput = Prisma.InputJsonValue | typeof Prisma.DbNull;

/**
 * A Json mezők `null` értéke a Prismában `Prisma.DbNull`; a többi mező
 * változatlanul megy tovább.
 */
export function withJsonNulls<T extends Partial<Record<JsonField, unknown>>>(
	data: T,
): Omit<T, JsonField> & Partial<Record<JsonField, JsonInput>> {
	const result: Record<string, unknown> = { ...data };
	for (const field of SHEET_MAPPING_FIELDS) {
		if (result[field] === null) result[field] = Prisma.DbNull;
	}
	return result as Omit<T, JsonField> & Partial<Record<JsonField, JsonInput>>;
}
