import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";
import { tagListSchema } from "./events/tags";

const id = z.string().min(1);
const text = z.string().nullish();
const date = z.coerce.date();

const eventSchema = z.object({
	id,
	name: z.string().min(1),
	from: date,
	to: date,
	companyName: text,
	location: text,
	description: text,
	applicationSheetUrl: text,
	ageRange: text,
	instructor: text,
	mentors: z.array(z.string()).default([]),
	tags: tagListSchema.default([]),
	capacity: z.number().int().min(0).default(0),
});

const applicantSchema = z.object({
	id,
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	birthYear: z.number().int().nullish(),
	schoolName: text,
	hometown: text,
	phoneNumber: text,
	email: text,
	parentFirstName: text,
	parentLastName: text,
	parentMothersName: text,
	parentAddress: text,
	parentEmail: text,
	parentPhone: text,
	newsletter: z.boolean().default(false),
});

const applicationSchema = z.object({
	id,
	eventId: id,
	applicantId: id,
	receivedAt: date.optional(),
	status: z.enum(ApplicationStatus).default(ApplicationStatus.APPLIED),
	foodPreference: text,
	heardFromWhere: text,
	heardFromWhom: text,
	solvedProblem: text,
	pastExpInProg: text,
	pastParticipationOther: text,
	pastParticipationSkool: z.boolean().default(false),
	pastParticipationSkoolDesc: text,
	comment: text,
	companyAwareness: z.boolean().default(false),
});

/**
 * A betölthető adatfájl formátuma (események, jelentkezők, jelentkezések).
 * A lokális seed használja; a későbbi Sheet-import ugyanebbe a formába
 * konvertálhat.
 */
export const dataFileSchema = z
	.object({
		events: z.array(eventSchema).default([]),
		applicants: z.array(applicantSchema).default([]),
		applications: z.array(applicationSchema).default([]),
	})
	.superRefine((data, ctx) => {
		const eventIds = new Set(data.events.map((e) => e.id));
		const applicantIds = new Set(data.applicants.map((a) => a.id));

		for (const key of ["events", "applicants", "applications"] as const) {
			const seen = new Set<string>();
			data[key].forEach((row, index) => {
				if (seen.has(row.id)) {
					ctx.addIssue({
						code: "custom",
						path: [key, index, "id"],
						message: `Duplicate id "${row.id}"`,
					});
				}
				seen.add(row.id);
			});
		}

		const pairs = new Set<string>();
		data.applications.forEach((application, index) => {
			if (!eventIds.has(application.eventId)) {
				ctx.addIssue({
					code: "custom",
					path: ["applications", index, "eventId"],
					message: `Unknown event "${application.eventId}"`,
				});
			}
			if (!applicantIds.has(application.applicantId)) {
				ctx.addIssue({
					code: "custom",
					path: ["applications", index, "applicantId"],
					message: `Unknown applicant "${application.applicantId}"`,
				});
			}
			const pair = `${application.eventId}:${application.applicantId}`;
			if (pairs.has(pair)) {
				ctx.addIssue({
					code: "custom",
					path: ["applications", index],
					message: "Duplicate (eventId, applicantId) pair",
				});
			}
			pairs.add(pair);
		});
	});

export type DataFile = z.output<typeof dataFileSchema>;
