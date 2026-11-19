import { notFound } from "next/navigation";
import { PageShell } from "@/components/admin-shell/page-shell";
import { EventActions } from "@/components/events/overview/event-actions";
import { EventHeader } from "@/components/events/overview/event-header";
import { EventTabs } from "@/components/events/overview/event-tabs";
import { eventHref } from "@/lib/events/links";
import { getEventOverview } from "@/lib/events/overview";
import { requireAdmin } from "@/lib/session";

/**
 * A program fejléce és szakaszai. Az `(overview)` csoport az URL-t nem
 * változtatja, de a szerkesztő oldal (`/events/[id]/edit`) így nem kapja meg
 * ezt a fejlécet.
 *
 * A layout és az oldalak párhuzamosan renderelnek, ezért mindkettő maga
 * ellenőrzi a munkamenetet (a lekérdezések kérésenként memoizáltak).
 */
export default async function EventLayout({
	children,
	params,
}: LayoutProps<"/events/[id]">) {
	const { id } = await params;
	await requireAdmin(eventHref(id));
	const overview = await getEventOverview(id);
	if (!overview) notFound();
	const { event, counts } = overview;

	return (
		<PageShell className="pb-16">
			<EventHeader
				event={event}
				applications={counts.total}
				now={new Date()}
				actions={
					<EventActions
						target={{
							id: event.id,
							name: event.name,
							applications: counts.total,
						}}
					/>
				}
			/>
			<EventTabs eventId={event.id} applications={counts.total} />
			{children}
		</PageShell>
	);
}
