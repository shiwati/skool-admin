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
	"CANCELLED",
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

/** A duplikáció-összehasonlító egy jelentkezője (API JSON alak). */
export type DuplicateApplicant = {
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
	parentMothersName: string | null;
	parentAddress: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	newsletter: boolean;
	/** Legfrissebb elöl. */
	applications: {
		id: string;
		receivedAt: string;
		status: ApplicationStatus;
		event: { id: string; name: string };
	}[];
};

/** `GET /api/applicants/duplicates` válasza. */
export type DuplicatesResponse = {
	/** Eldöntetlen párok száma. */
	total: number;
	/** A visszaadott pár 0-alapú sorszáma. */
	index: number;
	/** Az A a korábban létrehozott jelentkező; `null`, ha nincs pár. */
	pair: { a: DuplicateApplicant; b: DuplicateApplicant } | null;
};
