/**
 * CSV-szerializálás magyar Excelhez: pontosvessző elválasztó, CRLF sortörés,
 * UTF-8 BOM (különben az ékezetek elromlanak). Tiszta modul.
 */

const BOM = "\uFEFF";
const DELIMITER = ";";

/** Csak számjegyet és telefonszámokban szokásos jeleket tartalmazó érték. */
const NUMERIC_LIKE = /^[+-][\d\s()./-]*$/;

/**
 * Képletinjekció ellen: az `=`, `@`, tab, CR (és a nem számszerű `+`/`-`)
 * kezdetű cellát aposztróffal szöveggé tesszük. A telefonszám (`+36 30 …`)
 * érintetlen marad.
 */
export function neutralizeFormula(value: string): string {
	if (/^[=@\t\r]/.test(value)) return `'${value}`;
	if (/^[+-]/.test(value) && !NUMERIC_LIKE.test(value)) return `'${value}`;
	return value;
}

export function escapeCsvCell(value: string): string {
	const safe = neutralizeFormula(value);
	return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(headers: string[], rows: string[][]): string {
	const lines = [headers, ...rows].map((cells) =>
		cells.map(escapeCsvCell).join(DELIMITER),
	);
	return BOM + lines.join("\r\n") + "\r\n";
}
