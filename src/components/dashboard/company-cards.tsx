import { Star } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatScore } from "@/lib/dashboard/compute";
import type { CompanyDetail } from "@/lib/dashboard/insights";
import { RatioBadge } from "@/components/events/ratio-badge";
import { demandRatio } from "@/lib/events/format";
import { eventFeedbackHref } from "@/lib/feedback/format";
import { formatCount, formatDateRange } from "@/lib/format";
import { SectionHeader } from "./kpi-card";

/** A cég programjai: a sorra kattintva a program áttekintése nyílik meg. */
export function CompanyProgramsCard({ detail }: { detail: CompanyDetail }) {
	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Programok"
				subtitle={`${detail.name} programjai, a legutóbbi elöl`}
			/>
			{detail.rows.length === 0 ? (
				<p className="py-8 text-center text-sm text-text-secondary">
					Ehhez a céghez még nincs program.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[40rem] text-left text-sm">
						<thead>
							<tr className="font-mono text-[11px] text-text-secondary uppercase">
								<th className="py-2 pr-3 font-semibold">
									Program
								</th>
								<th className="px-3 py-2 font-semibold">
									Időpont
								</th>
								<th className="px-3 py-2 text-right font-semibold">
									Férőhely
								</th>
								<th className="px-3 py-2 text-right font-semibold">
									Jelentkező
								</th>
								<th className="px-3 py-2 text-right font-semibold">
									Túljelentkezés
								</th>
								<th className="py-2 pl-3 text-right font-semibold">
									Értékelés
								</th>
							</tr>
						</thead>
						<tbody>
							{detail.rows.map((row) => (
								<tr
									key={row.id}
									className="border-t border-border"
								>
									<td className="max-w-64 py-2.5 pr-3">
										<Link
											href={`/?program=${encodeURIComponent(row.id)}`}
											className="block truncate font-medium hover:underline"
											title={row.name}
										>
											{row.name}
										</Link>
									</td>
									<td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">
										{formatDateRange(row.from, row.to)}
									</td>
									<td className="px-3 py-2.5 text-right font-mono">
										{row.capacity > 0
											? formatCount(row.capacity)
											: "—"}
									</td>
									<td className="px-3 py-2.5 text-right font-mono">
										{formatCount(row.applications)}
									</td>
									<td className="px-3 py-2.5 text-right font-mono">
										{(() => {
											const ratio = demandRatio(
												row.applications,
												row.capacity,
											);
											return ratio === null ? (
												"—"
											) : (
												<RatioBadge ratio={ratio} />
											);
										})()}
									</td>
									<td className="py-2.5 pl-3 text-right font-mono">
										{row.rating === null ? (
											"—"
										) : (
											<Link
												href={eventFeedbackHref(row.id)}
												className="inline-flex items-center justify-end gap-1 hover:underline"
												aria-label={`${row.name}: ${formatScore(row.rating)}, visszajelzések megnyitása`}
											>
												<Star
													aria-hidden="true"
													className="size-3.5 fill-current text-warning-fg"
												/>
												<span className="font-medium">
													{formatScore(row.rating)}
												</span>
											</Link>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Card>
	);
}
