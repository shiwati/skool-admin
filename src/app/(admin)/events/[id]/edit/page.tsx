import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { getEvent } from "@/lib/events/queries";
import {
	readApplicationMapping,
	readFeedbackMapping,
} from "@/lib/sheet-mapping/schema";

export const metadata: Metadata = { title: "Program szerkesztése" };

// Access is enforced by the (admin) layout.
export default async function EditEventPage({
	params,
}: PageProps<"/events/[id]/edit">) {
	const { id } = await params;
	const event = await getEvent(id);
	if (!event) notFound();

	return (
		<EventForm
			mode="edit"
			event={{
				id: event.id,
				name: event.name,
				tags: event.tags,
				description: event.description,
				from: event.from.toISOString(),
				to: event.to.toISOString(),
				companyName: event.companyName,
				location: event.location,
				capacity: event.capacity,
				ageRange: event.ageRange,
				applicationSheetUrl: event.applicationSheetUrl,
				participantFeedbackSheetUrl: event.participantFeedbackSheetUrl,
				mentorFeedbackSheetUrl: event.mentorFeedbackSheetUrl,
				applicationSheetMapping: readApplicationMapping(
					event.applicationSheetMapping,
				),
				participantFeedbackSheetMapping: readFeedbackMapping(
					"PARTICIPANT",
					event.participantFeedbackSheetMapping,
				),
				mentorFeedbackSheetMapping: readFeedbackMapping(
					"MENTOR",
					event.mentorFeedbackSheetMapping,
				),
				instructor: event.instructor,
				mentors: event.mentors,
			}}
		/>
	);
}
