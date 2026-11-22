import { Star } from "lucide-react";
import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import { CapacityChart } from "@/components/dashboard/capacity-chart";
import { CompanyProgramsCard } from "@/components/dashboard/company-cards";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DemographicsCard } from "@/components/dashboard/demographics-card";
import {
	KpiCard,
	KpiGrid,
	SectionHeader,
} from "@/components/dashboard/kpi-card";
import { OversubscriptionTrend } from "@/components/dashboard/oversubscription-trend";
import {
	ChannelsCard,
	PartnersCard,
} from "@/components/dashboard/overview-cards";
import {
	ProgramFeedbackCard,
	ProgramFunnelCard,
} from "@/components/dashboard/program-cards";
import { SatisfactionCard } from "@/components/dashboard/satisfaction-card";
import type { Tone } from "@/components/dashboard/stat-badge";
import {
	formatScore,
	formatSignedDecimal,
	formatSignedPercent,
	greeting,
	percentChange,
	share,
	type Satisfaction,
} from "@/lib/dashboard/compute";
import type {
	CompanyDetail,
	FeedbackCompletion,
	Overview,
	ProgramDetail,
	Returning,
} from "@/lib/dashboard/insights";
import {
	loadCompanyDetail,
	loadOverview,
	loadProgramDetail,
} from "@/lib/dashboard/insights-load";
import { ALL_YEARS_LABEL } from "@/lib/dashboard/period";
import { feedbackSearch } from "@/lib/feedback/format";
import {
	loadComparison,
	resolveDashboard,
	type DashboardData,
	type PeriodComparison,
} from "@/lib/dashboard/load";
import { requireAdmin } from "@/lib/session";
import { formatCount, formatRatio } from "@/lib/format";

export const metadata: Metadata = { title: "Áttekintés" };
export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const single = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

function applicationsKpi({ applications, previousLabel }: PeriodComparison) {
	const change = percentChange(applications.current, applications.previous);
	return {
		value: formatCount(applications.current),
		badge: change === null ? undefined : formatSignedPercent(change),
		tone: (change === null
			? "neutral"
			: change >= 0
				? "ok"
				: "alert") as Tone,
		note:
			change === null
				? `nincs adat összevetéshez (${previousLabel})`
				: `vs. ${previousLabel} (${formatCount(applications.previous)})`,
	};
}

function oversubscriptionKpi({
	oversubscription: { current, previous },
	previousLabel,
}: PeriodComparison) {
	if (current === null)
		return {
			value: "—",
			badge: undefined,
			tone: "neutral" as Tone,
			note: "nincs férőhellyel meghirdetett program az időszakban",
		};
	if (previous === null)
		return {
			value: formatRatio(current),
			badge: undefined,
			tone: "neutral" as Tone,
			note: `nincs adat összevetéshez (${previousLabel})`,
		};
	return {
		value: formatRatio(current),
		badge: formatSignedDecimal(current - previous),
		tone: "info" as Tone,
		note: `jelentkezők / kapacitás · ${previousLabel}: ${formatRatio(previous)}`,
	};
}

function satisfactionKpi({
	satisfaction: { current, previous },
	previousLabel,
}: PeriodComparison) {
	const participant = current.PARTICIPANT.score;
	const before = previous.PARTICIPANT.score.average;
	const mentor = current.MENTOR.score;
	const responses = current.PARTICIPANT.responses + current.MENTOR.responses;
	if (responses === 0)
		return {
			value: "—",
			badge: undefined,
			tone: "neutral" as Tone,
			note: "nincs visszajelzés az év programjaira",
		};
	const mentorNote =
		mentor.average === null
			? "mentorok: —"
			: `mentorok: ${formatScore(mentor.average)}`;
	const counts = `${formatCount(responses)} kitöltés · ${mentorNote}`;
	if (participant.average === null || before === null)
		return {
			value:
				participant.average === null
					? "—"
					: `${formatScore(participant.average)} / 5`,
			badge: undefined,
			tone: "neutral" as Tone,
			note: `${counts} · nincs adat összevetéshez (${previousLabel})`,
		};
	const diff = participant.average - before;
	return {
		value: `${formatScore(participant.average)} / 5`,
		badge: formatSignedDecimal(diff),
		tone: (Math.round(diff * 10) === 0
			? "neutral"
			: diff > 0
				? "ok"
				: "alert") as Tone,
		note: `vs. ${previousLabel} (${formatScore(before)}) · ${counts}`,
	};
}

/**
 * Megjegyzés egymás utáni részekből: elfér egy sorban, különben a részek
 * egyben, a következő sorba törnek (a pötty az előző sor végén marad).
 */
function noteParts(parts: string[]) {
	return (
		<span className="flex flex-wrap gap-x-1">
			{parts.map((part, i) => (
				<span key={part} className="whitespace-nowrap">
					{part}
					{i < parts.length - 1 && " ·"}
				</span>
			))}
		</span>
	);
}

function completionKpi(completion: FeedbackCompletion | null) {
	const participants = completion?.participants;
	if (!completion || !participants || participants.expected === null)
		return {
			value: "—",
			note: "nincs részt vevőnek jelölt jelentkező az évben",
		};
	const mentors = completion.mentors;
	const mentorNote =
		mentors.expected === null
			? "mentorok: —"
			: `mentorok: ${formatCount(mentors.responses)} / ${formatCount(mentors.expected)}`;
	return {
		value: `${share(participants.responses, participants.expected)}%`,
		note: noteParts([
			`${formatCount(participants.responses)} / ${formatCount(participants.expected)} résztvevő`,
			mentorNote,
		]),
	};
}

/** Értékelés-kártya: az érték előtt csillag (mint az Elégedettség kártyán), ha van érték. */
function RatingKpiCard(props: ComponentProps<typeof KpiCard>) {
	return (
		<KpiCard
			{...props}
			icon={
				props.value === "—" ? undefined : (
					<Star
						aria-hidden="true"
						className="size-6 fill-current text-warning-fg"
					/>
				)
			}
		/>
	);
}

function ratingKpi({ PARTICIPANT, MENTOR }: Satisfaction) {
	const responses = PARTICIPANT.responses + MENTOR.responses;
	if (responses === 0) return { value: "—", note: "még nincs visszajelzés" };
	const mentor =
		MENTOR.score.average === null
			? "mentorok: —"
			: `mentorok: ${formatScore(MENTOR.score.average)}`;
	return {
		value:
			PARTICIPANT.score.average === null
				? "—"
				: `${formatScore(PARTICIPANT.score.average)} / 5`,
		note: noteParts([`${formatCount(responses)} kitöltés`, mentor]),
	};
}

function returningKpi({ returning, total }: Returning, scope: string) {
	return {
		value: total > 0 ? `${share(returning, total)}%` : "—",
		note:
			total > 0
				? `${formatCount(returning)} / ${formatCount(total)} ${scope}`
				: "még nincs jelentkező",
	};
}

function OverviewSection({
	overview,
	periodLabel,
	allYears,
}: {
	overview: Overview;
	periodLabel: string;
	allYears: boolean;
}) {
	return (
		<>
			<KpiGrid columns={5}>
				<KpiCard
					label="Programok"
					value={formatCount(overview.programs)}
					note={allYears ? "összesen" : "ebben az évben indult"}
				/>
				<KpiCard
					label="Diákok"
					value={formatCount(overview.students)}
					note="egyedi jelentkező"
				/>
				<KpiCard
					label="Visszatérő diákok"
					{...returningKpi(
						overview.returning,
						allYears
							? "diák jelentkezett 2+ programra"
							: "diák járt már korábbi év programján",
					)}
				/>
				{allYears ? (
					<KpiCard
						label="Hírlevél"
						value={formatCount(overview.newsletter)}
						note={`feliratkozó · ${share(overview.newsletter, overview.students)}% a diákokból`}
					/>
				) : (
					<KpiCard
						label="Értékelések kitöltöttsége"
						{...completionKpi(overview.completion)}
					/>
				)}
				<RatingKpiCard
					label="Átlagos értékelés"
					{...ratingKpi(overview.satisfaction)}
					wide
				/>
			</KpiGrid>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<DemographicsCard
					data={overview.demographics}
					subtitle={periodLabel}
					unit="diák"
					emptyText="Még nincs jelentkező."
					ageNote="Életkor = a diák legutóbbi programjának kezdő éve − születési év."
				/>
				<div className="flex min-w-0 flex-col gap-4">
					<PartnersCard rows={overview.companies} />
					<ChannelsCard
						rows={overview.channels}
						subtitle="A jelentkezők válasza arra, honnan hallottak a programról"
					/>
				</div>
			</div>
		</>
	);
}

function ProgramSection({ detail }: { detail: ProgramDetail }) {
	const { funnel } = detail;
	return (
		<>
			<KpiGrid>
				<KpiCard
					label="Jelentkezők"
					value={formatCount(funnel.total)}
					note={
						detail.oversubscription === null
							? "nincs megadva kapacitás"
							: `${formatRatio(detail.oversubscription)} túljelentkezés · ${formatCount(detail.capacity)} férőhely`
					}
				/>
				<KpiCard
					label="Kitöltöttség"
					value={
						detail.capacity > 0
							? `${share(funnel.accepted, detail.capacity)}%`
							: "—"
					}
					note={
						detail.capacity > 0
							? `${formatCount(funnel.accepted)} elfogadott / ${formatCount(detail.capacity)} férőhely`
							: "nincs megadva kapacitás"
					}
				/>
				<KpiCard
					label="Visszatérők"
					{...returningKpi(
						detail.returning,
						"jelentkező járt már korábbi programon",
					)}
					wide
				/>
			</KpiGrid>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<ProgramFunnelCard funnel={funnel} finished={detail.finished} />
				<ProgramFeedbackCard detail={detail} />
			</div>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<DemographicsCard
					data={detail.demographics}
					subtitle="A program jelentkezői"
					emptyText="Ehhez a programhoz még nincs jelentkezés."
					ageFit={detail.ageFit}
				/>
				<ChannelsCard
					rows={detail.channels}
					subtitle="A jelentkezők válasza arra, honnan hallottak a programról"
				/>
			</div>
		</>
	);
}

function CompanySection({ detail }: { detail: CompanyDetail }) {
	const { satisfaction } = detail;
	return (
		<>
			<KpiGrid columns={5}>
				<KpiCard
					label="Programok"
					value={formatCount(detail.programs)}
					note="a cég szervezésében"
				/>
				<KpiCard
					label="Diákok"
					value={formatCount(detail.students)}
					note="egyedi jelentkező"
				/>
				<KpiCard
					label="Mentorok"
					value={formatCount(detail.mentors)}
					note="egyedi mentor"
				/>
				<RatingKpiCard
					label="Átlagos értékelés"
					{...ratingKpi(satisfaction)}
					wide
				/>
				<KpiCard
					label="Értékelések"
					href={`/feedback${feedbackSearch({ company: detail.name })}`}
					hrefLabel="a cég visszajelzéseinek megnyitása"
					value={formatCount(
						satisfaction.PARTICIPANT.responses +
							satisfaction.MENTOR.responses,
					)}
					note={noteParts([
						`${formatCount(satisfaction.PARTICIPANT.responses)} résztvevő`,
						`${formatCount(satisfaction.MENTOR.responses)} mentor`,
					])}
				/>
			</KpiGrid>

			<CompanyProgramsCard detail={detail} />
		</>
	);
}

// Access is enforced by the (admin) layout; the session is read for the greeting.
// Two database rounds: the filters (with the session), then every figure at once.
export default async function DashboardPage({ searchParams }: Props) {
	const params = await searchParams;
	const now = new Date();
	const [session, { base, period }] = await Promise.all([
		requireAdmin("/"),
		resolveDashboard(
			{
				period: single(params.period),
				program: single(params.program),
				company: single(params.company),
			},
			now,
		),
	]);
	const name = session.user?.name ?? session.user?.email ?? "admin";
	const [comparison, overview, programDetail, companyDetail] =
		await Promise.all([
			period ? loadComparison(period, now) : null,
			base.mode === "year" ? loadOverview(base.range) : null,
			base.program ? loadProgramDetail(base.program.id, now) : null,
			base.company ? loadCompanyDetail(base.company) : null,
		]);
	const data: DashboardData = { ...base, comparison };
	const periodLabel =
		data.year === null ? ALL_YEARS_LABEL : String(data.year);

	return (
		<PageShell>
			<PageHeader
				eyebrow="Áttekintés"
				title={`${greeting(now)}, ${name}!`}
				description={
					programDetail
						? programDetail.name
						: companyDetail
							? companyDetail.name
							: comparison
								? `${periodLabel} · összevetés: ${comparison.previousLabel}`
								: periodLabel
				}
				actions={
					// Mobile: one horizontally scrollable row below the title.
					<div className="relative -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
						<DashboardActions data={data} />
					</div>
				}
			/>

			{programDetail && <ProgramSection detail={programDetail} />}

			{companyDetail && <CompanySection detail={companyDetail} />}

			{overview && (
				<OverviewSection
					overview={overview}
					periodLabel={periodLabel}
					allYears={data.range === null}
				/>
			)}

			{overview && comparison && (
				<>
					<SectionHeader
						title="Összevetés az előző évvel"
						subtitle={`${periodLabel} vs. ${comparison.previousLabel}`}
					/>

					<KpiGrid>
						<KpiCard
							label="Összes jelentkező"
							{...applicationsKpi(comparison)}
						/>
						<KpiCard
							label="Átlagos túljelentkezés"
							{...oversubscriptionKpi(comparison)}
						/>
						<RatingKpiCard
							label="Átlagos elégedettség"
							{...satisfactionKpi(comparison)}
							wide
						/>
					</KpiGrid>

					<SectionHeader
						title="Programok"
						subtitle={`A(z) ${periodLabel}. évben induló programok`}
					/>

					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
						<CapacityChart rows={comparison.capacity} />
						<OversubscriptionTrend points={comparison.trend} />
					</div>

					<SatisfactionCard
						programs={comparison.satisfactionByProgram}
						satisfaction={comparison.satisfaction.current}
					/>
				</>
			)}
		</PageShell>
	);
}
