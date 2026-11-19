import { ageFromBirthYear, fullName } from "@/lib/applicants/format";
import type { ApplicantDetail } from "@/lib/applicants/detail";
import { DetailCard, KeyValueList, mailLink, phoneLink } from "./detail-card";

export function PersonalDataCard({
	applicant,
	now,
}: {
	applicant: ApplicantDetail;
	now: Date;
}) {
	const age = ageFromBirthYear(applicant.birthYear, now);
	return (
		<DetailCard title="Személyes adatok" subtitle="A jelentkezési űrlapból">
			<KeyValueList
				items={[
					{ key: "Teljes név", value: fullName(applicant) },
					{
						key: "Születési év",
						value:
							applicant.birthYear === null
								? null
								: `${applicant.birthYear} · ${age} év`,
					},
					{ key: "E-mail", value: mailLink(applicant.email) },
					{ key: "Telefon", value: phoneLink(applicant.phoneNumber) },
					{ key: "Iskola", value: applicant.schoolName },
					{ key: "Település", value: applicant.hometown },
				]}
			/>
		</DetailCard>
	);
}

export function ParentDataCard({ applicant }: { applicant: ApplicantDetail }) {
	const name = [applicant.parentLastName, applicant.parentFirstName]
		.filter(Boolean)
		.join(" ");
	return (
		<DetailCard title="Szülő / gondviselő">
			<KeyValueList
				items={[
					{ key: "Név", value: name || null },
					{ key: "Anyja neve", value: applicant.parentMothersName },
					{ key: "Cím", value: applicant.parentAddress },
					{ key: "E-mail", value: mailLink(applicant.parentEmail) },
					{ key: "Telefon", value: phoneLink(applicant.parentPhone) },
				]}
			/>
		</DetailCard>
	);
}
