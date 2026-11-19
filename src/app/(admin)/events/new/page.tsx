import type { Metadata } from "next";
import { EventForm } from "@/components/events/event-form";

export const metadata: Metadata = { title: "Új program" };

// Access is enforced by the (admin) layout.
export default function NewEventPage() {
	return <EventForm mode="create" />;
}
