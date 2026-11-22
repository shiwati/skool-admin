import { FORM_ANSWER_FIELDS } from "@/lib/applicants/detail-labels";
import type { ApplicantDetailApplication } from "@/lib/applicants/detail";
import { DetailCard } from "./detail-card";
import { formatDateTime } from "@/lib/format";

/** A megválaszolt kérdések; a „Részt vettél már…” csak igen esetén. */
export function answeredQuestions(application: ApplicantDetailApplication) {
	const answers: { label: string; value: string }[] = [];
	for (const { field, label } of FORM_ANSWER_FIELDS) {
		const raw = application[field];
		if (typeof raw === "boolean") {
			if (raw) answers.push({ label, value: "Igen" });
		} else if (raw?.trim()) {
			answers.push({ label, value: raw });
		}
	}
	return answers;
}

/** A legfrissebb jelentkezés válaszai; jelentkezés nélkül nem jelenik meg. */
export function FormAnswersCard({
	application,
}: {
	application: ApplicantDetailApplication | null;
}) {
	if (!application) return null;
	const answers = answeredQuestions(application);
	return (
		<DetailCard
			title="Jelentkezési űrlap válaszai"
			subtitle={`${application.event.name} · beküldve ${formatDateTime(application.receivedAt)}`}
		>
			{answers.length === 0 ? (
				<p className="text-sm text-text-secondary">
					Nincs kitöltött válasz
				</p>
			) : (
				<dl className="flex flex-col gap-3.5 text-sm">
					{answers.map(({ label, value }) => (
						<div key={label} className="flex flex-col gap-0.5">
							<dt className="text-text-tertiary">{label}</dt>
							<dd className="break-words whitespace-pre-line">
								{value}
							</dd>
						</div>
					))}
				</dl>
			)}
		</DetailCard>
	);
}
