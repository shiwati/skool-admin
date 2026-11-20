import { Star, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatCount } from "@/lib/applicants/format";
import {
	formatScore,
	share,
	type ProgramSatisfaction,
	type RecommendSummary,
	type Satisfaction,
	type ScoreSummary,
} from "@/lib/dashboard/compute";
import { SectionHeader } from "./kpi-card";

function Score({ summary, role }: { summary: ScoreSummary; role: string }) {
	if (summary.average === null)
		return (
			<span className="text-text-tertiary">
				—<span className="sr-only"> {role}: nincs értékelés</span>
			</span>
		);
	return (
		<span className="inline-flex items-center justify-end gap-1">
			<Star
				aria-hidden="true"
				className="size-3.5 fill-current text-warning-fg"
			/>
			<span className="font-medium">{formatScore(summary.average)}</span>
			<span className="sr-only">
				{" "}
				{role}: {summary.count} értékelés alapján
			</span>
		</span>
	);
}

/** "Ajánlaná" összegzés egy szerepkörre; `null`, ha nincs rá válasz. */
export function recommendText(label: string, r: RecommendSummary) {
	if (r.total === 0) return null;
	return `${label}: ${share(r.yes, r.total)}% igen · ${share(r.maybe, r.total)}% talán · ${share(r.no, r.total)}% nem (${formatCount(r.total)} válasz)`;
}

/** Programonkénti elégedettség (DB01: „Elégedettség” kártya). */
export function SatisfactionCard({
	programs,
	satisfaction,
	programSelected = false,
}: {
	programs: ProgramSatisfaction[];
	satisfaction: Satisfaction;
	/** Egy programra szűrt nézet (más üres állapot-szöveg). */
	programSelected?: boolean;
}) {
	const recommend = [
		recommendText("Résztvevők", satisfaction.PARTICIPANT.recommend),
		recommendText("Mentorok", satisfaction.MENTOR.recommend),
	].filter((t) => t !== null);

	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Elégedettség"
				subtitle="Feedback átlag (1–5) programonként, a program kezdete szerint"
			/>
			{programs.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
					<Star
						aria-hidden="true"
						className="size-6 text-text-tertiary"
					/>
					<p className="text-sm text-text-secondary">
						{programSelected
							? "Ehhez a programhoz még nincs visszajelzés."
							: "A kiválasztott időszakban még nincs visszajelzés."}
					</p>
					<p className="max-w-xs text-xs text-text-tertiary">
						A visszajelzések a program Visszajelzések fülén
						szinkronizálhatók a Google Sheetből.
					</p>
				</div>
			) : (
				<table className="w-full text-sm">
					<thead>
						<tr className="font-mono text-[11px] font-semibold text-text-secondary uppercase">
							<th
								scope="col"
								className="pb-2 text-left font-semibold"
							>
								Program
							</th>
							<th
								scope="col"
								className="w-20 pb-2 text-right font-semibold"
							>
								Résztvevő
							</th>
							<th
								scope="col"
								className="w-16 pb-2 text-right font-semibold"
							>
								Mentor
							</th>
							<th
								scope="col"
								className="hidden w-20 pb-2 text-right font-semibold sm:table-cell"
							>
								Kitöltés
							</th>
						</tr>
					</thead>
					<tbody>
						{programs.map((p) => (
							<tr
								key={p.id}
								className="border-t border-border-default"
							>
								<th
									scope="row"
									className="max-w-0 py-2 text-left font-normal"
								>
									<Link
										href={`/events/${p.id}/feedback`}
										className="block truncate hover:underline"
										title={p.name}
									>
										{p.name}
									</Link>
								</th>
								<td className="py-2 text-right">
									<Score
										summary={p.participant}
										role="résztvevők"
									/>
								</td>
								<td className="py-2 text-right">
									<Score summary={p.mentor} role="mentorok" />
								</td>
								<td className="hidden py-2 text-right font-mono text-xs text-text-secondary sm:table-cell">
									{formatCount(
										p.participant.count + p.mentor.count,
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			{recommend.length > 0 && (
				<div className="mt-auto flex items-start gap-2 rounded-lg bg-info-bg px-3 py-2.5 text-xs text-info-fg">
					<ThumbsUp
						aria-hidden="true"
						className="mt-px size-4 shrink-0"
					/>
					<div className="flex flex-col gap-0.5">
						<span className="font-medium">Ajánlaná másoknak</span>
						{recommend.map((t) => (
							<span key={t}>{t}</span>
						))}
					</div>
				</div>
			)}
		</Card>
	);
}
