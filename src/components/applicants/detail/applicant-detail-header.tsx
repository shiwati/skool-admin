import type { ReactNode } from "react";
import {
	applicantInitials,
	formatDateTime,
	fullName,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
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
	const latest = applicant.applications[0] ?? null;
	const tags = applicantTags(applicant, now);
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<div className="flex min-w-[320px] flex-1 items-center gap-4">
				<span
					aria-hidden="true"
					className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lavender text-lg font-semibold"
				>
					{applicantInitials(applicant)}
				</span>
				<div className="flex flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl leading-8 font-bold">
							{fullName(applicant)}
						</h1>
						<ul
							aria-label="Státusz és címkék"
							className="flex flex-wrap gap-2"
						>
							{latest && (
								<li>
									<Pill
										className={
											STATUS_BADGE_CLASSES[latest.status]
										}
									>
										{STATUS_LABELS[latest.status]}
									</Pill>
								</li>
							)}
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
