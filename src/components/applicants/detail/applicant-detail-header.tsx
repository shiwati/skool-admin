import type { ReactNode } from "react";
import {
	applicantInitials,
	formatDateTime,
	fullName,
} from "@/lib/applicants/format";
import type { ApplicantDetail } from "@/lib/applicants/detail";
import { applicantTags } from "./applicant-tags";
import { Pill } from "./detail-card";

export function ApplicantDetailHeader({
	applicant,
	now,
	actions,
}: {
	applicant: ApplicantDetail;
	now: Date;
	actions?: ReactNode;
}) {
	const tags = applicantTags(applicant, now);
	return (
		// Mobile: centred (board 04.1 M). Below xl the actions take their own
		// full-width row (board 04.1 T).
		<div
			data-testid="detail-header"
			className="flex flex-wrap items-center justify-between gap-4"
		>
			<div className="flex min-w-0 flex-1 basis-full flex-col items-center gap-2 text-center md:basis-auto md:flex-row md:gap-4 md:text-left">
				<span
					aria-hidden="true"
					className="flex size-16 shrink-0 items-center justify-center rounded-full bg-lavender text-xl font-semibold md:size-14 md:text-lg"
				>
					{applicantInitials(applicant)}
				</span>
				<div className="flex min-w-0 flex-col items-center gap-1.5 md:items-start">
					<div className="flex flex-col flex-wrap items-center gap-2 md:flex-row">
						<h1 className="text-2xl leading-8 font-bold">
							{fullName(applicant)}
						</h1>
						<ul
							aria-label="Státusz és címkék"
							className="flex flex-wrap justify-center gap-2"
						>
							{tags.over16 && (
								<li>
									<Pill className="bg-info-bg text-info-fg">
										16+
									</Pill>
								</li>
							)}
							{tags.newsletter && (
								<li>
									<Pill className="bg-success-bg text-success-fg">
										Hírlevél
									</Pill>
								</li>
							)}
							{tags.alumni && (
								<li>
									<Pill className="bg-sage">Alumni</Pill>
								</li>
							)}
						</ul>
					</div>
					<span className="font-mono text-xs text-text-secondary">
						Létrehozva {formatDateTime(applicant.createdAt)} ·
						Módosítva {formatDateTime(applicant.updatedAt)}
					</span>
				</div>
			</div>
			{actions}
		</div>
	);
}
