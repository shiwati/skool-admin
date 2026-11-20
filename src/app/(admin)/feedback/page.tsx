import type { Metadata } from "next";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import { FeedbackView } from "@/components/feedback/feedback-view";
import { formatCount, formatDateTime } from "@/lib/applicants/format";
import { firstEventYear } from "@/lib/dashboard/first-year";
import { periodYears } from "@/lib/dashboard/period";
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
	const [data, events, lastImport, openItem, firstYear] = await Promise.all([
		listFeedback(query),
		feedbackEventOptions(),
		lastFeedbackImport(),
		query.open ? getFeedback(query.open) : null,
		firstEventYear(),
	]);

	return (
		<PageShell>
			<FeedbackView
				data={data}
				state={query}
				basePath="/feedback"
				events={events}
				periods={periodYears(new Date(), firstYear).map((y) => ({
					key: String(y),
					label: String(y),
				}))}
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
