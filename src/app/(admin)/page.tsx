import type { Metadata } from "next";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import { CapacityChart } from "@/components/dashboard/capacity-chart";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DemographicsCard } from "@/components/dashboard/demographics-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OversubscriptionTrend } from "@/components/dashboard/oversubscription-trend";
import { SatisfactionCard } from "@/components/dashboard/satisfaction-card";
import type { Tone } from "@/components/dashboard/stat-badge";
import { formatCount } from "@/lib/applicants/format";
import {
	formatRatio,
	formatSignedDecimal,
	formatSignedPercent,
	greeting,
	percentChange,
} from "@/lib/dashboard/compute";
import { loadDashboard, type DashboardData } from "@/lib/dashboard/load";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Áttekintés" };
export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const single = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

function applicationsKpi({ applications, period }: DashboardData) {
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
				? `nincs adat összevetéshez (${period.previousLabel})`
				: `vs. ${period.previousLabel} (${formatCount(applications.previous)})`,
	};
}

function oversubscriptionKpi({
	oversubscription: { current, previous },
	period,
}: DashboardData) {
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
			note: `nincs adat összevetéshez (${period.previousLabel})`,
		};
	return {
		value: formatRatio(current),
		badge: formatSignedDecimal(current - previous),
		tone: "info" as Tone,
		note: `jelentkezés / férőhely · ${period.previousLabel}: ${formatRatio(previous)}`,
	};
}

// Access is enforced by the (admin) layout; the session is read for the greeting.
export default async function DashboardPage({ searchParams }: Props) {
	const session = await requireAdmin("/");
	const name = session.user?.name ?? session.user?.email ?? "admin";
	const params = await searchParams;
	const now = new Date();
	const data = await loadDashboard(
		{ period: single(params.period), program: single(params.program) },
		now,
	);

	return (
		<PageShell>
			<PageHeader
				eyebrow="Áttekintés"
				title={`${greeting(now)}, ${name}!`}
				description={`${data.period.label} · ${data.program?.name ?? "összes program"} · összevetés: ${data.period.previousLabel}`}
				actions={<DashboardActions data={data} />}
			/>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<KpiCard label="Összes jelentkező" {...applicationsKpi(data)} />
				<KpiCard
					label="Átlagos túljelentkezés"
					{...oversubscriptionKpi(data)}
				/>
				<KpiCard
					label="Átlagos elégedettség"
					value="—"
					badge="hamarosan"
					note="feedback formok alapján"
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<CapacityChart rows={data.capacity} />
				<OversubscriptionTrend points={data.trend} />
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<DemographicsCard
					data={data.demographics}
					periodLabel={data.period.label}
				/>
				<SatisfactionCard />
			</div>
		</PageShell>
	);
}
