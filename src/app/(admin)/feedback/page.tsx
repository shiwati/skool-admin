import type { Metadata } from "next";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import { FeedbackView } from "@/components/feedback/feedback-view";
import { formatCount, formatDateTime } from "@/lib/applicants/format";
import { periodOptions } from "@/lib/dashboard/period";
import {
	feedbackEventOptions,
	parseFeedbackQuery,
	getFeedback,
	lastFeedbackImport,
	listFeedback,
} from "@/lib/feedback/list";

export const metadata: Metadata = { title: "Visszajelzések" };

// Access is enforced by the (admin) layout.
export default async function FeedbackPage({
	searchParams,
}: PageProps<"/feedback">) {
	const query = parseFeedbackQuery(await searchParams);
	const [data, events, lastImport, openItem] = await Promise.all([
		listFeedback(query),
		feedbackEventOptions(),
		lastFeedbackImport(),
		query.open ? getFeedback(query.open) : null,
	]);

	return (
		<PageShell>
			<FeedbackView
				data={data}
				state={query}
				basePath="/feedback"
				events={events}
				periods={periodOptions(new Date())}
				openItem={openItem}
				header={
					<PageHeader
						eyebrow="Visszajelzések"
						title="Visszajelzések"
						description={
							<>
								Visszajelző Google Formokból ·{" "}
								{formatCount(data.stats.count)} kitöltés
								{lastImport && (
									<>
										{" "}
										· utolsó import{" "}
										{formatDateTime(lastImport)}
									</>
								)}
							</>
						}
					/>
				}
			/>
		</PageShell>
	);
}
