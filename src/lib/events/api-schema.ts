import { z } from "zod";
import {
	applicationSheetMappingSchema,
	feedbackSheetMappingSchema,
} from "@/lib/sheet-mapping/schema";
import { tagListSchema } from "./tags";

const optionalField = z
	.string()
	.trim()
	.transform((v) => v || null)
	.nullish();

const shape = {
	name: z.string().trim().min(1),
	from: z.coerce.date(),
	to: z.coerce.date(),
	companyName: optionalField,
	location: optionalField,
	description: optionalField,
	tags: tagListSchema,
	applicationSheetUrl: z.url().nullish(),
	participantFeedbackSheetUrl: z.url().nullish(),
	mentorFeedbackSheetUrl: z.url().nullish(),
	applicationSheetMapping: applicationSheetMappingSchema.nullish(),
	participantFeedbackSheetMapping:
		feedbackSheetMappingSchema("PARTICIPANT").nullish(),
	mentorFeedbackSheetMapping: feedbackSheetMappingSchema("MENTOR").nullish(),
	ageRange: optionalField,
	instructor: optionalField,
	mentors: z.array(z.string().trim().min(1)),
	capacity: z.number().int().min(0),
};

export const END_BEFORE_START_API_MESSAGE = "Must not be earlier than `from`";

const endNotBeforeStart = {
	path: ["to"],
	message: END_BEFORE_START_API_MESSAGE,
};

export const createEventSchema = z
	.object({
		...shape,
		tags: shape.tags.default([]),
		mentors: shape.mentors.default([]),
		capacity: shape.capacity.default(0),
	})
	.refine((e) => e.to >= e.from, endNotBeforeStart);

/**
 * `PATCH` törzs: csak a megadott mezők változnak, az opcionális szöveges
 * mezők `null`-lal törölhetők. A `to >= from` ellenőrzés a kezelőben
 * történik a meglévő értékekkel egyesítve.
 */
export const updateEventSchema = z
	.object(shape)
	.partial()
	.refine((e) => Object.keys(e).length > 0, {
		message: "At least one field is required",
	})
	.refine((e) => !e.from || !e.to || e.to >= e.from, endNotBeforeStart);
