import { toCsv } from "@/lib/csv";
import { eventPeople } from "./format";
import { EVENT_STATUS_LABELS, eventStatus } from "./phase";
import { formatDate } from "@/lib/format";

/** A program exportálásához szükséges mezők (a `GET /api/events` elemének része). */
export type ExportableEvent = {
	name: string;
	from: string;
	to: string;
	companyName: string | null;
	location: string | null;
	applicationSheetUrl: string | null;
	instructor: string | null;
	mentors: string[];
	tags: string[];
	capacity: number;
	applicationCounts: { total: number };
};

const HEADERS = [
	"Program",
	"Címkék",
	"Kezdés",
	"Befejezés",
	"Helyszín",
	"Partnercég",
	"Kapacitás",
	"Jelentkezők",
	"Oktatók",
	"Státusz",
];

/** A Programok tábla összes oszlopa, alapértelmezett sorrendben (az oszlopbeállítástól függetlenül). */
export function buildEventsCsv(
	items: ExportableEvent[],
	now: Date = new Date(),
): string {
	return toCsv(
		HEADERS,
		items.map((item) => {
			const applications = item.applicationCounts.total;
			return [
				item.name,
				item.tags.join(", "),
				formatDate(item.from),
				formatDate(item.to),
				item.location ?? "",
				item.companyName ?? "",
				String(item.capacity),
				String(applications),
				eventPeople(item.instructor, item.mentors)
					.map((person) => person.name)
					.join(", "),
				EVENT_STATUS_LABELS[
					eventStatus({ ...item, applications }, now)
				],
			];
		}),
	);
}
