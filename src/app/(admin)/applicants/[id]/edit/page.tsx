import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicantEditForm } from "@/components/applicants/edit/applicant-edit-form";
import { getApplicantForEdit } from "@/lib/applicants/detail";
import { toApplicantFormValues } from "@/lib/applicants/edit-schema";
import { fullName } from "@/lib/applicants/format";
import { requireAdmin } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

/**
 * Layouts and pages render concurrently: the page checks the session itself
 * before reading personal data (the session lookup is cached per request).
 */
async function load(id: string) {
	await requireAdmin(`/applicants/${encodeURIComponent(id)}/edit`);
	return getApplicantForEdit(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const applicant = await load((await params).id);
	return {
		title: applicant
			? `Szerkesztés · ${fullName(applicant)}`
			: "Jelentkező",
	};
}

export default async function ApplicantEditPage({ params }: Props) {
	const { id } = await params;
	const applicant = await load(id);
	if (!applicant) notFound();

	return (
		<ApplicantEditForm
			id={applicant.id}
			name={fullName(applicant)}
			initialValues={toApplicantFormValues(applicant)}
			updatedAt={applicant.updatedAt.toISOString()}
		/>
	);
}
