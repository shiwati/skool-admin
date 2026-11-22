import type { Event } from "@prisma/client";
import {
	DetailCard,
	KeyValueList,
	Pill,
} from "@/components/applicants/detail/detail-card";
import { tagClass } from "@/lib/events/colors";
import { formatAgeRange } from "@/lib/events/format";
import { formatDateTime } from "@/lib/format";

type DetailsEvent = Pick<
	Event,
	| "from"
	| "to"
	| "companyName"
	| "location"
	| "ageRange"
	| "description"
	| "tags"
>;

export function EventDetailsCard({ event }: { event: DetailsEvent }) {
	return (
		<DetailCard title="Program adatai">
			<KeyValueList
				items={[
					{
						key: "Időpont",
						value: `${formatDateTime(event.from)} – ${formatDateTime(event.to)}`,
					},
					{
						key: "Korosztály",
						value: event.ageRange
							? formatAgeRange(event.ageRange)
							: null,
					},
					{ key: "Helyszín / partnercég", value: event.companyName },
					{ key: "Cím", value: event.location },
					{
						key: "Címkék",
						value:
							event.tags.length > 0 ? (
								<ul className="flex flex-wrap gap-2">
									{event.tags.map((tag) => (
										<li key={tag}>
											<Pill className={tagClass(tag)}>
												{tag}
											</Pill>
										</li>
									))}
								</ul>
							) : null,
					},
				]}
			/>
			<div className="flex flex-col gap-0.5 text-sm">
				<h3 className="text-text-tertiary">Rövid leírás</h3>
				{event.description ? (
					<p className="font-medium break-words whitespace-pre-line">
						{event.description}
					</p>
				) : (
					<p className="text-text-tertiary">—</p>
				)}
			</div>
		</DetailCard>
	);
}
