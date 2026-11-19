import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicantsView } from "@/components/applicants/applicants-view";

export const metadata: Metadata = { title: "Jelentkezők" };

// Access is enforced by the (admin) layout.
export default function ApplicantsPage() {
	return (
		<div className="flex flex-col gap-5 px-8 pt-7 pb-28">
			{/* useSearchParams in the view needs a Suspense boundary. */}
			<Suspense>
				<ApplicantsView />
			</Suspense>
		</div>
	);
}
