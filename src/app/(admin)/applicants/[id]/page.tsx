import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicantDetailActions } from "@/components/applicants/detail/applicant-detail-actions";
import { ApplicantDetailHeader } from "@/components/applicants/detail/applicant-detail-header";
import {
	ParentDataCard,
	PersonalDataCard,
} from "@/components/applicants/detail/data-cards";
import { FormAnswersCard } from "@/components/applicants/detail/form-answers-card";
import { HistoryCard } from "@/components/applicants/detail/history-card";
import { ProgramsTable } from "@/components/applicants/detail/programs-table";
import { TagsCard } from "@/components/applicants/detail/tags-card";
import { getApplicantDetail } from "@/lib/applicants/detail";
import { fullName } from "@/lib/applicants/format";
import { requireAdmin } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

/**
 * The layout guards the group too, but layouts and pages render
 * concurrently: the page checks the session itself before reading
 * personal data (the session lookup is cached per request).
 */
async function load(id: string) {
	await requireAdmin(`/applicants/${encodeURIComponent(id)}`);
	return getApplicantDetail(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const applicant = await load((await params).id);
	return { title: applicant ? fullName(applicant) : "Jelentkező" };
}

export default async function ApplicantDetailPage({ params }: Props) {
	const { id } = await params;
	const applicant = await load(id);
	if (!applicant) notFound();

	const now = new Date();
	const name = fullName(applicant);

	return (
		<div className="flex flex-col gap-5 px-8 pt-7 pb-16">
			<nav aria-label="Morzsamenü" className="text-sm">
				<ol className="flex flex-wrap items-center gap-2">
					<li>
						<Link
							href="/applicants"
							className="font-medium underline-offset-2 hover:underline"
						>
							Jelentkezők
						</Link>
					</li>
					<li aria-hidden="true" className="text-text-tertiary">
						›
					</li>
					<li>
						<span
							aria-current="page"
							className="text-text-secondary"
						>
							{name}
						</span>
					</li>
				</ol>
			</nav>

			<ApplicantDetailHeader
				applicant={applicant}
				now={now}
				actions={
					<ApplicantDetailActions id={applicant.id} name={name} />
				}
			/>

			<div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="flex min-w-0 flex-col gap-5">
					<PersonalDataCard applicant={applicant} now={now} />
					<ParentDataCard applicant={applicant} />
					<ProgramsTable applications={applicant.applications} />
					<FormAnswersCard
						application={applicant.applications[0] ?? null}
					/>
				</div>
				<aside
					className="flex min-w-0 flex-col gap-5"
					aria-label="Kiegészítő adatok"
				>
					<TagsCard applicant={applicant} now={now} />
					<HistoryCard entries={applicant.history} />
				</aside>
			</div>
		</div>
	);
}
