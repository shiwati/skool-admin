import type { FeedbackRoleKey } from "@/lib/feedback/questions";
import { quoteId } from "./content";

/** Szöveges kérdések, amelyekből idézet választható (a fejlesztési javaslatok nem). */
export const QUOTE_QUESTIONS: Record<
	FeedbackRoleKey,
	Record<string, string>
> = {
	PARTICIPANT: {
		feeling: "Hogy érezte magát?",
		favoriteTopic: "Kedvenc rész",
		messageToGirls: "Üzenet a lányoknak",
		messageToMentor: "Üzenet a mentornak",
		otherComment: "Egyéb",
	},
	MENTOR: {
		highlight: "A nap fénypontja",
		motivation: "Motiváció",
		otherComment: "Egyéb",
	},
};

/** Az idézet szerzője a riportban: csak a szerep, név soha. */
export const QUOTE_ROLE_LABELS: Record<FeedbackRoleKey, string> = {
	PARTICIPANT: "résztvevő",
	MENTOR: "mentor",
};

const MIN_LENGTH = 8;

export type QuoteCandidate = {
	id: string;
	feedbackId: string;
	questionKey: string;
	role: FeedbackRoleKey;
	questionLabel: string;
	text: string;
};

export type QuoteSource = {
	id: string;
	role: FeedbackRoleKey;
	answers: Record<string, unknown>;
};

/** A választható idézetek: résztvevők elöl, kérdésenként, rövid/üres válaszok nélkül. */
export function quoteCandidates(feedback: QuoteSource[]): QuoteCandidate[] {
	const out: QuoteCandidate[] = [];
	for (const role of ["PARTICIPANT", "MENTOR"] as const) {
		for (const [questionKey, questionLabel] of Object.entries(
			QUOTE_QUESTIONS[role],
		)) {
			for (const item of feedback) {
				if (item.role !== role) continue;
				const value = item.answers[questionKey];
				if (typeof value !== "string") continue;
				const text = value.trim();
				if (text.length < MIN_LENGTH) continue;
				out.push({
					id: quoteId({ feedbackId: item.id, questionKey }),
					feedbackId: item.id,
					questionKey,
					role,
					questionLabel,
					text,
				});
			}
		}
	}
	return out;
}
