import { toCsv } from "@/lib/csv";
import type { ColumnId } from "./column-settings";
import {
	ageFromBirthYear,
	attendedCount,
	latestApplication,
	parentLabel,
	STATUS_LABELS,
} from "./format";
import type { ApplicantListItem } from "./types";
import { formatDate } from "@/lib/format";

type ExportColumn = {
	header: string;
	value: (item: ApplicantListItem, now: Date) => string;
};

/**
 * A táblázat oszlopainak CSV-megfelelője. A kétsoros cellák (név + e-mail,
 * település + iskola, szülő neve + e-mail) több CSV-oszlopra bomlanak; a
 * jelentkező neve külön vezeték- és keresztnévként.
 */
export const EXPORT_COLUMNS: Record<ColumnId, ExportColumn[]> = {
	name: [
		{ header: "Vezetéknév", value: (item) => item.lastName },
		{ header: "Keresztnév", value: (item) => item.firstName },
		{ header: "E-mail", value: (item) => item.email ?? "" },
	],
	age: [
		{
			header: "Életkor",
			value: (item, now) =>
				String(ageFromBirthYear(item.birthYear, now) ?? ""),
		},
	],
	program: [
		{
			header: "Program",
			value: (item) => {
				const { latest, more } = latestApplication(item.applications);
				if (!latest) return "";
				return more > 0
					? `${latest.event.name} (+${more})`
					: latest.event.name;
			},
		},
	],
	status: [
		{
			header: "Státusz",
			value: (item) => {
				const { latest } = latestApplication(item.applications);
				return latest ? STATUS_LABELS[latest.status] : "";
			},
		},
	],
	location: [
		{ header: "Település", value: (item) => item.hometown ?? "" },
		{ header: "Iskola", value: (item) => item.schoolName ?? "" },
	],
	newsletter: [
		{
			header: "Hírlevél",
			value: (item) => (item.newsletter ? "igen" : "nem"),
		},
	],
	history: [
		{
			header: "Elvégzett programok",
			value: (item) => String(attendedCount(item.applications)),
		},
	],
	createdAt: [
		{ header: "Jelentkezett", value: (item) => formatDate(item.createdAt) },
	],
	parent: [
		{ header: "Szülő neve", value: (item) => parentLabel(item).name ?? "" },
		{
			header: "Szülő e-mail",
			value: (item) => parentLabel(item).email ?? "",
		},
	],
	phone: [{ header: "Telefonszám", value: (item) => item.phoneNumber ?? "" }],
};

/** A megadott (látható, a felhasználó szerinti sorrendű) oszlopok CSV-je. */
export function buildApplicantsCsv(
	items: ApplicantListItem[],
	columns: readonly ColumnId[],
	now: Date = new Date(),
): string {
	const exportColumns = columns.flatMap((id) => EXPORT_COLUMNS[id]);
	return toCsv(
		exportColumns.map((column) => column.header),
		items.map((item) =>
			exportColumns.map((column) => column.value(item, now)),
		),
	);
}
