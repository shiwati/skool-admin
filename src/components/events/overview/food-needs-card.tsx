import Link from "next/link";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { FoodNeeds } from "@/lib/events/food-needs";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Függőleges sáv a sor bal szélén; a sorok egymás alatt egybefüggő sávot adnak. */
function Bar({ className }: { className: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn("absolute inset-y-0 left-0 w-1.5", className)}
		/>
	);
}

/** Az étkezési igények: név és válasz, státuszcsoportonként, a végén az igény nélküliek száma. */
export function FoodNeedsCard({ foodNeeds }: { foodNeeds: FoodNeeds }) {
	return (
		<DetailCard
			title="Étkezési igény"
			subtitle={`${formatCount(foodNeeds.covered)} jelentkező · részt vett, elfogadva és új jelentkező`}
		>
			{foodNeeds.covered === 0 ? (
				<p className="text-sm text-text-secondary">
					Még nincs jelentkező, akinek az étkezési igényét
					mutathatnánk.
				</p>
			) : foodNeeds.groups.length > 0 ? (
				<div className="overflow-x-auto">
					<table className="w-full min-w-72 border-separate border-spacing-0 text-sm">
						<caption className="sr-only">
							Jelentkezők étkezési igénye státuszcsoportonként
						</caption>
						<thead>
							<tr className="text-left text-xs text-text-tertiary">
								<th
									scope="col"
									className="py-2 pr-3 pl-4 font-medium"
								>
									Név
								</th>
								<th
									scope="col"
									className="px-3 py-2 font-medium"
								>
									Étkezési igény
								</th>
							</tr>
						</thead>
						{foodNeeds.groups.map((group) => (
							<tbody
								key={group.status}
								aria-label={STATUS_LABELS[group.status]}
							>
								<tr>
									<th
										colSpan={2}
										scope="colgroup"
										className="border-t border-border-default pt-3 pr-3 pb-1 pl-0 text-left text-xs font-normal text-text-tertiary"
									>
										<span>
											{STATUS_LABELS[group.status]}
										</span>{" "}
										<span className="font-mono">
											{formatCount(group.rows.length)}
										</span>
									</th>
								</tr>
								{group.rows.map((row) => (
									<tr key={row.applicantId}>
										<td className="relative py-1.5 pr-3 pl-4 align-top">
											<Bar
												className={
													STATUS_BADGE_CLASSES[
														group.status
													]
												}
											/>
											<Link
												href={`/applicants/${row.applicantId}`}
												className="font-medium underline-offset-4 hover:underline"
											>
												{row.name}
											</Link>
										</td>
										<td className="px-3 py-1.5 align-top text-text-secondary">
											{row.answer}
										</td>
									</tr>
								))}
							</tbody>
						))}
					</table>
				</div>
			) : null}
			{foodNeeds.covered > 0 && (
				<p className="border-t border-border-default pt-3 text-sm text-text-secondary">
					{`Összesen ${formatCount(foodNeeds.unrestricted)} főnek nincs étkezési igénye.`}
				</p>
			)}
		</DetailCard>
	);
}
