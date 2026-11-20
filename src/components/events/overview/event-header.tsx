import type { Event } from "@prisma/client";
import { CalendarDays, MapPin, User } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/admin-shell/breadcrumb";
import { Pill } from "@/components/applicants/detail/detail-card";
import { tagClass } from "@/lib/events/colors";
import { eventPeople, formatDateRange } from "@/lib/events/format";
import {
	EVENT_STATUS_BADGE_CLASSES,
	EVENT_STATUS_LABELS,
	eventStatus,
} from "@/lib/events/phase";

type HeaderEvent = Pick<
	Event,
	| "name"
	| "from"
	| "to"
	| "companyName"
	| "location"
	| "applicationSheetUrl"
	| "capacity"
	| "tags"
	| "instructor"
	| "mentors"
>;

function MetaItem({
	icon: Icon,
	children,
}: {
	icon: typeof CalendarDays;
	children: ReactNode;
}) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<Icon aria-hidden="true" className="size-4 shrink-0" />
			{children}
		</span>
	);
}

export function EventHeader({
	event,
	applications,
	now,
	actions,
}: {
	event: HeaderEvent;
	applications: number;
	now: Date;
	actions?: ReactNode;
}) {
	const status = eventStatus({ ...event, applications }, now);
	const place = [event.companyName, event.location]
		.filter(Boolean)
		.join(", ");
	const people = eventPeople(event.instructor, event.mentors);
	const shown = people.slice(0, 2).map((person) => person.name);
	const more = people.length - shown.length;

	return (
		<>
			<Breadcrumb
				items={[
					{ label: "Programok", href: "/events" },
					{ label: event.name },
				]}
			/>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl leading-8 font-bold break-words">
							{event.name}
						</h1>
						<ul
							aria-label="Címkék és státusz"
							className="flex flex-wrap gap-2"
						>
							{event.tags.map((tag) => (
								<li key={tag}>
									<Pill className={tagClass(tag)}>{tag}</Pill>
								</li>
							))}
							<li>
								<Pill
									className={
										EVENT_STATUS_BADGE_CLASSES[status]
									}
								>
									<span
										aria-hidden="true"
										className="size-1.5 rounded-full bg-current"
									/>
									{EVENT_STATUS_LABELS[status]}
								</Pill>
							</li>
						</ul>
					</div>
					<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
						<MetaItem icon={CalendarDays}>
							{formatDateRange(event.from, event.to)}
						</MetaItem>
						{place && <MetaItem icon={MapPin}>{place}</MetaItem>}
						{shown.length > 0 && (
							<MetaItem icon={User}>
								{shown.join(", ")}
								{more > 0 && ` +${more}`}
							</MetaItem>
						)}
					</p>
				</div>
				{actions}
			</div>
		</>
	);
}
