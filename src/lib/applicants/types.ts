/**
 * A `GET /api/applicants` válaszának kliensoldali alakja (JSON-ként a dátumok
 * ISO szövegek). Forrás: `src/app/api/applicants/route.ts`.
 */

export const APPLICATION_STATUSES = [
	"APPLIED",
	"ACCEPTED",
	"REJECTED",
	"ATTENDED",
	"WAITLISTED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicantApplication = {
	id: string;
	status: ApplicationStatus;
	receivedAt: string;
	event: { id: string; name: string; from: string };
};

export type ApplicantListItem = {
	id: string;
	createdAt: string;
	firstName: string;
	lastName: string;
	birthYear: number | null;
	schoolName: string | null;
	hometown: string | null;
	phoneNumber: string | null;
	email: string | null;
	parentFirstName: string | null;
	parentLastName: string | null;
	parentEmail: string | null;
	newsletter: boolean;
	/** Legfrissebb elöl (`receivedAt desc`). */
	applications: ApplicantApplication[];
};

export type ApplicantsPage = {
	items: ApplicantListItem[];
	total: number;
	page: number;
	pageSize: number;
};

export type EventOption = { id: string; name: string };
