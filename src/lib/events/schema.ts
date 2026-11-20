import { z } from "zod";
import type { FeedbackSheetMapping } from "@/lib/feedback/questions";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import type { ApplicationSheetMapping } from "@/lib/sheet-import/mapping";
import {
	applicationSheetMappingSchema,
	feedbackSheetMappingSchema,
} from "@/lib/sheet-mapping/schema";
import { tagListSchema } from "./tags";

export const REQUIRED_MESSAGE = "Kötelező mező";
export const SHEET_URL_MESSAGE = "Adj meg egy érvényes Google Sheets linket.";
export const END_BEFORE_START_MESSAGE =
	"A befejezés nem lehet korábbi a kezdésnél.";
export const CAPACITY_MESSAGE = "Legalább 1 fő legyen.";
export const AGE_ORDER_MESSAGE =
	"A minimum életkor nem lehet nagyobb a maximumnál.";

const MAX_MENTORS = 30;

const tag = z.string().trim().min(1).max(50);

/** A böngésző `datetime-local` értéke (`2027-03-06T10:00`), helyi időben. */
const localDateTime = z
	.string()
	.min(1, REQUIRED_MESSAGE)
	.refine(
		(value) => !Number.isNaN(new Date(value).getTime()),
		"Érvénytelen dátum",
	);

const ageField = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d{1,2}$/.test(value), "Egész szám");

const sheetUrlField = z
	.string()
	.trim()
	.refine(
		(value) =>
			value === "" ||
			(z.url().safeParse(value).success && parseSheetUrl(value) !== null),
		SHEET_URL_MESSAGE,
	);

/** `null` = alapértelmezett; egyébként a szerver sémájával ellenőrizve, egy üzenetben. */
const mappingField = <T>(schema: z.ZodType) =>
	z.custom<T | null>().superRefine((value, ctx) => {
		if (value === null || value === undefined) return;
		const result = schema.safeParse(value);
		if (!result.success) {
			ctx.addIssue({
				code: "custom",
				message: result.error.issues.map((i) => i.message).join(" "),
			});
		}
	});

/** Az űrlap értékei: minden szám és dátum szövegként, ahogy a mezők adják. */
export const eventFormSchema = z
	.object({
		name: z.string().trim().min(1, REQUIRED_MESSAGE).max(200),
		tags: tagListSchema,
		description: z.string().trim().max(2000),
		from: localDateTime,
		to: localDateTime,
		companyName: z.string().trim().max(200),
		location: z.string().trim().max(300),
		capacity: z
			.string()
			.trim()
			.min(1, REQUIRED_MESSAGE)
			.refine(
				(value) => /^\d+$/.test(value) && Number(value) >= 1,
				CAPACITY_MESSAGE,
			),
		ageFrom: ageField,
		ageTo: ageField,
		applicationSheetUrl: sheetUrlField,
		participantFeedbackSheetUrl: sheetUrlField,
		mentorFeedbackSheetUrl: sheetUrlField,
		applicationSheetMapping: mappingField<ApplicationSheetMapping>(
			applicationSheetMappingSchema,
		),
		participantFeedbackSheetMapping: mappingField<FeedbackSheetMapping>(
			feedbackSheetMappingSchema("PARTICIPANT"),
		),
		mentorFeedbackSheetMapping: mappingField<FeedbackSheetMapping>(
			feedbackSheetMappingSchema("MENTOR"),
		),
		instructor: z.string().trim().max(200),
		mentors: z.array(tag).max(MAX_MENTORS),
	})
	.refine(
		({ from, to }) =>
			!from || !to || new Date(to).getTime() >= new Date(from).getTime(),
		{ path: ["to"], message: END_BEFORE_START_MESSAGE },
	)
	.refine(
		({ ageFrom, ageTo }) =>
			ageFrom === "" || ageTo === "" || Number(ageFrom) <= Number(ageTo),
		{ path: ["ageTo"], message: AGE_ORDER_MESSAGE },
	);

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** A `POST /api/events` törzse; a szerver sémája az `api-schema.ts`-ben van. */
export type CreateEventInput = {
	name: string;
	tags: string[];
	description?: string;
	from: string;
	to: string;
	companyName?: string;
	location?: string;
	capacity: number;
	ageRange?: string;
	applicationSheetUrl?: string;
	participantFeedbackSheetUrl?: string;
	mentorFeedbackSheetUrl?: string;
	applicationSheetMapping?: ApplicationSheetMapping;
	participantFeedbackSheetMapping?: FeedbackSheetMapping;
	mentorFeedbackSheetMapping?: FeedbackSheetMapping;
	instructor?: string;
	mentors: string[];
};

/** A `PATCH /api/events/[id]` törzse: minden mező megy, az üres választhatók `null`-ként törlődnek. */
export type UpdateEventInput = {
	name: string;
	tags: string[];
	description: string | null;
	from: string;
	to: string;
	companyName: string | null;
	location: string | null;
	capacity: number;
	ageRange: string | null;
	applicationSheetUrl: string | null;
	participantFeedbackSheetUrl: string | null;
	mentorFeedbackSheetUrl: string | null;
	applicationSheetMapping: ApplicationSheetMapping | null;
	participantFeedbackSheetMapping: FeedbackSheetMapping | null;
	mentorFeedbackSheetMapping: FeedbackSheetMapping | null;
	instructor: string | null;
	mentors: string[];
};

/** A szerkesztőoldalnak átadott program: dátumok ISO szövegként, ahogy az API adja. */
export type EventFormSource = {
	id: string;
	name: string;
	tags: string[];
	description: string | null;
	from: string;
	to: string;
	companyName: string | null;
	location: string | null;
	capacity: number;
	ageRange: string | null;
	applicationSheetUrl: string | null;
	participantFeedbackSheetUrl: string | null;
	mentorFeedbackSheetUrl: string | null;
	applicationSheetMapping: ApplicationSheetMapping | null;
	participantFeedbackSheetMapping: FeedbackSheetMapping | null;
	mentorFeedbackSheetMapping: FeedbackSheetMapping | null;
	instructor: string | null;
	mentors: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO időpontból a böngésző helyi idejében vett `datetime-local` érték. */
function toLocalDateTime(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A `toCreateEventInput` fordítottja; böngészőben fusson, hogy a helyi idő egyezzen a mentéskorival. */
export function toEventFormValues(event: EventFormSource): EventFormValues {
	const age = event.ageRange?.match(/^(\d{1,2})-(\d{1,2})$/);
	return {
		name: event.name,
		// Every stored tag is kept, so editing never drops one.
		tags: event.tags,
		description: event.description ?? "",
		from: toLocalDateTime(event.from),
		to: toLocalDateTime(event.to),
		companyName: event.companyName ?? "",
		location: event.location ?? "",
		capacity: String(event.capacity),
		ageFrom: age?.[1] ?? "",
		ageTo: age?.[2] ?? "",
		applicationSheetUrl: event.applicationSheetUrl ?? "",
		participantFeedbackSheetUrl: event.participantFeedbackSheetUrl ?? "",
		mentorFeedbackSheetUrl: event.mentorFeedbackSheetUrl ?? "",
		applicationSheetMapping: event.applicationSheetMapping,
		participantFeedbackSheetMapping: event.participantFeedbackSheetMapping,
		mentorFeedbackSheetMapping: event.mentorFeedbackSheetMapping,
		instructor: event.instructor ?? "",
		mentors: event.mentors,
	};
}

export function toUpdateEventInput(values: EventFormValues): UpdateEventInput {
	const create = toCreateEventInput(values);
	return {
		...create,
		description: create.description ?? null,
		companyName: create.companyName ?? null,
		location: create.location ?? null,
		ageRange: create.ageRange ?? null,
		applicationSheetUrl: create.applicationSheetUrl ?? null,
		participantFeedbackSheetUrl: create.participantFeedbackSheetUrl ?? null,
		mentorFeedbackSheetUrl: create.mentorFeedbackSheetUrl ?? null,
		applicationSheetMapping: create.applicationSheetMapping ?? null,
		participantFeedbackSheetMapping:
			create.participantFeedbackSheetMapping ?? null,
		mentorFeedbackSheetMapping: create.mentorFeedbackSheetMapping ?? null,
		instructor: create.instructor ?? null,
	};
}

/** Az űrlap értékeiből a végpont törzse; az üres választható mezők kimaradnak. */
export function toCreateEventInput(values: EventFormValues): CreateEventInput {
	const ageRange =
		values.ageFrom !== "" && values.ageTo !== ""
			? `${Number(values.ageFrom)}-${Number(values.ageTo)}`
			: undefined;
	return {
		name: values.name,
		tags: values.tags,
		description: values.description || undefined,
		from: new Date(values.from).toISOString(),
		to: new Date(values.to).toISOString(),
		companyName: values.companyName || undefined,
		location: values.location || undefined,
		capacity: Number(values.capacity),
		ageRange,
		applicationSheetUrl: values.applicationSheetUrl || undefined,
		participantFeedbackSheetUrl:
			values.participantFeedbackSheetUrl || undefined,
		mentorFeedbackSheetUrl: values.mentorFeedbackSheetUrl || undefined,
		// A link nélküli sheet megfeleltetése nem marad meg.
		applicationSheetMapping:
			(values.applicationSheetUrl && values.applicationSheetMapping) ||
			undefined,
		participantFeedbackSheetMapping:
			(values.participantFeedbackSheetUrl &&
				values.participantFeedbackSheetMapping) ||
			undefined,
		mentorFeedbackSheetMapping:
			(values.mentorFeedbackSheetUrl &&
				values.mentorFeedbackSheetMapping) ||
			undefined,
		instructor: values.instructor || undefined,
		mentors: values.mentors,
	};
}
