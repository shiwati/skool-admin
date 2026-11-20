import {
	formatDate,
	formatDateRange,
	programColorClass,
	programsSummary,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
} from "@/lib/applicants/format";
import type { ApplicantDetailApplication } from "@/lib/applicants/detail";
import { cn } from "@/lib/utils";
import { Pill } from "./detail-card";

const TH =
	"px-4 py-2.5 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase";

export function ProgramsTable({
	applications,
}: {
	applications: ApplicantDetailApplication[];
}) {
	return (
		<section
			aria-labelledby="programs-title"
			className="overflow-hidden rounded-[14px] border border-border-default bg-white shadow-card"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-default px-5 py-4">
				<h2
					id="programs-title"
					className="text-base leading-6 font-semibold"
				>
					Programok
				</h2>
				<span className="text-sm text-text-tertiary">
					{programsSummary(applications)}
				</span>
			</div>
			{applications.length === 0 ? (
				<p className="px-5 py-8 text-center text-sm text-text-secondary">
					Még nincs jelentkezése
				</p>
			) : (
				<>
					{/* Mobile: a list instead of the table (board 04.1 M). */}
					<ul
						aria-label="Programok"
						className="divide-y divide-border-default md:hidden"
					>
						{applications.map((application) => (
							<li
								key={application.id}
								className="flex items-start gap-3 px-4 py-3"
							>
								<span
									aria-hidden="true"
									className={cn(
										"mt-1.5 size-2 shrink-0 rounded-full",
										programColorClass(application.event.id),
									)}
								/>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="font-medium">
										{application.event.name}
									</span>
									<span className="font-mono text-xs text-text-tertiary">
										{formatDateRange(
											application.event.from,
											application.event.to,
										)}
									</span>
								</span>
								<Pill
									className={
										STATUS_BADGE_CLASSES[application.status]
									}
								>
									{STATUS_LABELS[application.status]}
								</Pill>
							</li>
						))}
					</ul>
					<div
						data-testid="programs-table-frame"
						className="relative hidden overflow-x-auto md:block"
					>
						<table className="w-full min-w-[640px] border-collapse text-sm">
							<caption className="sr-only">Programok</caption>
							<thead className="bg-surface-subtle text-left">
								<tr className="border-b border-border-default">
									<th scope="col" className={TH}>
										Program
									</th>
									<th scope="col" className={TH}>
										Időpont
									</th>
									<th scope="col" className={TH}>
										Státusz
									</th>
									<th scope="col" className={TH}>
										Jelentkezett
									</th>
								</tr>
							</thead>
							<tbody>
								{applications.map((application) => (
									<tr
										key={application.id}
										className="border-b border-border-default last:border-0"
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<span
													aria-hidden="true"
													className={cn(
														"size-2 shrink-0 rounded-full",
														programColorClass(
															application.event
																.id,
														),
													)}
												/>
												<span className="font-medium">
													{application.event.name}
												</span>
											</div>
										</td>
										<td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-text-secondary">
											{formatDateRange(
												application.event.from,
												application.event.to,
											)}
										</td>
										<td className="px-4 py-3">
											<Pill
												className={
													STATUS_BADGE_CLASSES[
														application.status
													]
												}
											>
												{
													STATUS_LABELS[
														application.status
													]
												}
											</Pill>
										</td>
										<td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-text-secondary">
											{formatDate(application.receivedAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</section>
	);
}
