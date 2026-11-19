import { z } from "zod";
import { eventTagSchema, type EventTag } from "./tags";

export const REQUIRED_MESSAGE = "Kötelező mező";
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

/** Az űrlap értékei: minden szám és dátum szövegként, ahogy a mezők adják. */
export const eventFormSchema = z
	.object({
		name: z.string().trim().min(1, REQUIRED_MESSAGE).max(200),
		tags: z.array(eventTagSchema),
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

/** A `POST /api/events` törzse; a szerver sémája az `api/events/route.ts`-ben van. */
export type CreateEventInput = {
	name: string;
	tags: EventTag[];
	description?: string;
	from: string;
	to: string;
	companyName?: string;
	location?: string;
	capacity: number;
	ageRange?: string;
	instructor?: string;
	mentors: string[];
};

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
		instructor: values.instructor || undefined,
		mentors: values.mentors,
	};
}
