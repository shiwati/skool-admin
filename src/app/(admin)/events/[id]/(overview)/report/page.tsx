import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	DetailCard,
	KeyValueList,
} from "@/components/applicants/detail/detail-card";
import { ReportEditor } from "@/components/reports/report-editor";
import { formatCount } from "@/lib/applicants/format";
import { formatAgeRange } from "@/lib/events/format";
import { eventReportHref } from "@/lib/events/links";
import { getEventReport } from "@/lib/reports/load";
import { reportDateText, reportTitle } from "@/lib/reports/format";
import { requireAdmin } from "@/lib/session";

type Props = PageProps<"/events/[id]/report">;

/** Munkamenet-ellenőrzés az adatolvasás előtt (a layout és az oldal párhuzamosan renderel). */
async function load(id: string) {
	await requireAdmin(eventReportHref(id));
	return getEventReport(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const report = await load((await params).id);
	return {
		title: report ? `Záró riport – ${report.event.name}` : "Program",
	};
}

export default async function EventReportPage({ params }: Props) {
	const { id } = await params;
	const report = await load(id);
	if (!report) notFound();
	const { event } = report;

	return (
		<div className="flex flex-col gap-4">
			<DetailCard
				title="Alapadatok"
				subtitle="A programból és a „Részt vett” státuszú jelentkezőkből. A riport nyelve magyar; angol változathoz használd a Docs „Eszközök → Dokumentum lefordítása” menüjét."
			>
				<KeyValueList
					items={[
						{
							key: "Riport címe",
							value: reportTitle({
								eventName: event.name,
								companyName: event.companyName,
							}),
						},
						{
							key: "Időpont",
							value: reportDateText(event.from, event.to),
						},
						{ key: "Helyszín", value: event.location },
						{
							key: "Rövid leírás",
							value: event.description ? (
								<span className="font-normal whitespace-pre-line">
									{event.description}
								</span>
							) : (
								<span className="font-normal text-warning-fg">
									Nincs megadva – a program szerkesztésénél
									pótolható
								</span>
							),
						},
						{
							key: "Résztvevők",
							value:
								report.participants > 0 ? (
									formatCount(report.participants)
								) : (
									<span className="font-normal text-warning-fg">
										0 – még senki nincs „Részt vett”
										státuszban
									</span>
								),
						},
						{
							key: "Korosztály",
							value: event.ageRange
								? formatAgeRange(event.ageRange)
								: null,
						},
					]}
				/>
			</DetailCard>
			<ReportEditor
				eventId={event.id}
				initialContent={report.content}
				candidates={report.candidates}
				metrics={report.metrics.map((m) => ({
					key: m.key,
					label: m.label,
					percent: m.percent,
					answered: m.answered,
				}))}
				documents={report.documents.map((d) => ({
					...d,
					createdAt: d.createdAt.toISOString(),
				}))}
			/>
		</div>
	);
}
