import { Star, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
	formatCount,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
} from "@/lib/applicants/format";
import { formatScore, share } from "@/lib/dashboard/compute";
import type {
	Completion,
	Funnel,
	ProgramDetail,
} from "@/lib/dashboard/insights";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./kpi-card";
import { recommendText } from "./satisfaction-card";

type Step = { label: string; count: number; className: string };

/** Jelentkezési tölcsér: jelentkezett → elfogadva → részt vett. */
export function ProgramFunnelCard({
	funnel,
	finished,
}: {
	funnel: Funnel;
	/** A részvétel csak a program után ismert. */
	finished: boolean;
}) {
	const steps: Step[] = [
		{ label: "Jelentkezett", count: funnel.total, className: "bg-sky" },
		{
			label: "Elfogadva",
			count: funnel.accepted,
			className: "bg-lavender",
		},
		...(finished
			? [
					{
						label: STATUS_LABELS.ATTENDED,
						count: funnel.attended,
						className: STATUS_BADGE_CLASSES.ATTENDED,
					},
				]
			: []),
	];
	const side = [
		{ label: STATUS_LABELS.REJECTED, count: funnel.rejected },
		{ label: STATUS_LABELS.WAITLISTED, count: funnel.waitlisted },
		{ label: "Feldolgozásra vár", count: funnel.pending },
	];

	return (
		<Card className="flex h-full min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Jelentkezési tölcsér"
				subtitle="Az elfogadottak közt a részt vevők is szerepelnek"
			/>
			{funnel.total === 0 ? (
				<p className="py-8 text-center text-sm text-text-secondary">
					Ehhez a programhoz még nincs jelentkezés.
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{steps.map((step) => (
						<li
							key={step.label}
							className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
						>
							<span className="w-full text-sm md:w-28">
								{step.label}
							</span>
							<span
								aria-hidden="true"
								className="relative h-5 min-w-30 flex-1 rounded-md bg-surface-subtle"
							>
								<span
									className={cn(
										"absolute inset-y-0 left-0 rounded-md",
										step.className,
									)}
									style={{
										width: `${share(step.count, funnel.total)}%`,
									}}
								/>
							</span>
							<span className="w-28 text-right font-mono text-xs text-text-secondary">
								{formatCount(step.count)} ·{" "}
								{share(step.count, funnel.total)}%
							</span>
						</li>
					))}
				</ul>
			)}
			{funnel.total > 0 && (
				<div className="mt-auto flex flex-col gap-2">
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
						{side.map((s) => (
							<span key={s.label}>
								{s.label}:{" "}
								<strong>{formatCount(s.count)}</strong>
							</span>
						))}
					</div>
					{finished && funnel.accepted > 0 && (
						<p className="text-xs text-text-tertiary">
							Az elfogadottak{" "}
							{share(funnel.attended, funnel.accepted)}%-a részt
							vett.
						</p>
					)}
				</div>
			)}
		</Card>
	);
}

function ScoreLine({
	label,
	average,
	count,
}: {
	label: string;
	average: number | null;
	count: number;
}) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span>{label}</span>
			{average === null ? (
				<span className="text-text-tertiary">—</span>
			) : (
				<span className="inline-flex items-center gap-1">
					<Star
						aria-hidden="true"
						className="size-3.5 fill-current text-warning-fg"
					/>
					<span className="font-medium">{formatScore(average)}</span>
					<span className="text-xs text-text-tertiary">
						({formatCount(count)} értékelés)
					</span>
				</span>
			)}
		</div>
	);
}

/** „12 / 20 résztvevő (60%)”; ismeretlen elvárt létszámnál csak a darabszám. */
export function completionText(label: string, c: Completion): string {
	if (c.expected === null)
		return `${label}: ${formatCount(c.responses)} kitöltés`;
	return `${label}: ${formatCount(c.responses)} / ${formatCount(c.expected)} (${share(c.responses, c.expected)}%)`;
}

/** Egy program visszajelzés-összképe: átlagok, ajánlás, kitöltési arány. */
export function ProgramFeedbackCard({ detail }: { detail: ProgramDetail }) {
	const { satisfaction, completion } = detail;
	const responses =
		satisfaction.PARTICIPANT.responses + satisfaction.MENTOR.responses;
	const recommend = [
		recommendText("Résztvevők", satisfaction.PARTICIPANT.recommend),
		recommendText("Mentorok", satisfaction.MENTOR.recommend),
	].filter((t) => t !== null);

	return (
		<Card className="flex h-full min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Visszajelzések"
				subtitle="Összértékelés (1–5) és kitöltési arány"
			/>
			{responses === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
					<Star
						aria-hidden="true"
						className="size-6 text-text-tertiary"
					/>
					<p className="text-sm text-text-secondary">
						Ehhez a programhoz még nincs visszajelzés.
					</p>
					<p className="max-w-xs text-xs text-text-tertiary">
						A visszajelzések a program Visszajelzések fülén
						szinkronizálhatók a Google Sheetből.
					</p>
				</div>
			) : (
				<>
					<div className="flex flex-col gap-2">
						<ScoreLine
							label="Résztvevők"
							average={satisfaction.PARTICIPANT.score.average}
							count={satisfaction.PARTICIPANT.score.count}
						/>
						<ScoreLine
							label="Mentorok"
							average={satisfaction.MENTOR.score.average}
							count={satisfaction.MENTOR.score.count}
						/>
					</div>
					<div className="flex flex-col gap-0.5 text-xs text-text-secondary">
						<span>
							{completionText(
								"Kitöltés – résztvevők",
								completion.participants,
							)}
						</span>
						<span>
							{completionText(
								"Kitöltés – mentorok",
								completion.mentors,
							)}
						</span>
					</div>
				</>
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
