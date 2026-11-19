import { DetailCard } from "@/components/applicants/detail/detail-card";
import { eventPeople } from "@/lib/events/format";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export function PeopleCard({
	instructor,
	mentors,
}: {
	instructor: string | null;
	mentors: string[];
}) {
	const people = eventPeople(instructor, mentors);

	return (
		<DetailCard title="Oktatók & mentorok">
			{people.length === 0 ? (
				<p className="text-sm text-text-secondary">
					Még nincs oktató vagy mentor megadva.
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{people.map((person, index) => (
						<li
							key={`${person.role}-${person.name}-${index}`}
							className="flex items-center gap-3"
						>
							<span
								aria-hidden="true"
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
									person.role === "oktató"
										? "bg-pink-strong"
										: "bg-pink",
								)}
							>
								{initials(person.name)}
							</span>
							<span className="flex min-w-0 flex-col text-sm">
								<span className="font-medium break-words">
									{person.name}
								</span>
								<span className="text-text-tertiary">
									{person.role}
								</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</DetailCard>
	);
}
