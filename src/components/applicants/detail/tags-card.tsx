import {
	ALUMNI_DESCRIPTION,
	ALUMNI_LABEL,
	TAG_BADGE_CLASSES,
} from "@/lib/applicants/format";
import type { ApplicantDetail } from "@/lib/applicants/detail";
import { applicantTags } from "./applicant-tags";
import { DetailCard, Pill } from "./detail-card";

export function TagsCard({
	applicant,
	now,
}: {
	applicant: ApplicantDetail;
	now: Date;
}) {
	const tags = applicantTags(applicant, now);
	const any = tags.over16 || tags.newsletter || tags.alumni;
	return (
		<DetailCard title="Címkék">
			{any ? (
				<ul aria-label="Címkék" className="flex flex-wrap gap-2">
					{tags.over16 && (
						<li>
							<Pill className={TAG_BADGE_CLASSES.over16}>
								16+
							</Pill>
						</li>
					)}
					{tags.newsletter && (
						<li>
							<Pill className={TAG_BADGE_CLASSES.newsletter}>
								Hírlevél
							</Pill>
						</li>
					)}
					{tags.alumni && (
						<li>
							<Pill className={TAG_BADGE_CLASSES.alumni}>
								{ALUMNI_LABEL}
							</Pill>
						</li>
					)}
				</ul>
			) : (
				<p className="text-sm text-text-secondary">Nincs címke</p>
			)}
			<p className="text-sm text-text-tertiary">
				A 16+ címkét a rendszer a születési év alapján adja és veszi el;
				kézzel nem módosítható.
			</p>
			<p className="text-sm text-text-tertiary">
				{ALUMNI_LABEL}: {ALUMNI_DESCRIPTION}
			</p>
		</DetailCard>
	);
}
