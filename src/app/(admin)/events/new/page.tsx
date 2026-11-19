import type { Metadata } from "next";
import { NewEventForm } from "@/components/events/new-event-form";

export const metadata: Metadata = { title: "Új program" };

// Access is enforced by the (admin) layout.
export default function NewEventPage() {
	return <NewEventForm />;
}
