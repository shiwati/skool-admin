import { ageFromBirthYear, isAlumni, isOver16 } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";

/** Az adatlap automatikus és jelző címkéi (fejléc és Címkék kártya). */
export function applicantTags(
	applicant: {
		birthYear: number | null;
		newsletter: boolean;
		applications: { status: ApplicationStatus }[];
	},
	now: Date,
) {
	return {
		over16: isOver16(ageFromBirthYear(applicant.birthYear, now)),
		newsletter: applicant.newsletter,
		alumni: isAlumni(applicant.applications),
	};
}
