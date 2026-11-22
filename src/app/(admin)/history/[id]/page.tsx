import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/admin-shell/breadcrumb";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import {
	HistoryChangeDiff,
	HistoryChangeSummary,
} from "@/components/history/history-change";
import { PageShell } from "@/components/admin-shell/page-shell";
import { programColorClass } from "@/lib/applicants/format";
import { eventHref } from "@/lib/events/links";
import { groupByDay } from "@/lib/history/group";
import {
	getHistoryEntries,
	getHistorySubject,
	HISTORY_PAGE_LIMIT,
	type HistorySubject,
} from "@/lib/history/queries";
import { initials } from "@/lib/initials";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { formatCount, formatTime } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

/**
 * The layout guards the group too, but layouts and pages render
 * concurrently: the page checks the session itself before reading data
 * (the session lookup is cached per request).
 */
async function load(id: string) {
	await requireAdmin(`/history/${encodeURIComponent(id)}`);
	return getHistorySubject(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const subject = await load((await params).id);
	return {
		title: subject
			? `${subject.name} · Változástörténet`
			: "Változástörténet",
	};
}

/** Hová visz vissza a morzsamenü: a lista és a rekord saját oldala. */
function crumbs(subject: HistorySubject) {
	return subject.kind === "applicant"
		? {
				list: { href: "/applicants", label: "Jelentkezők" },
				href: `/applicants/${encodeURIComponent(subject.id)}`,
			}
		: {
				list: { href: "/events", label: "Programok" },
				href: eventHref(subject.id),
			};
}

/** Morzsamenü és név; jelentkezőnél és programnál ugyanúgy. */
function HistoryHeader({ subject }: { subject: HistorySubject }) {
	const { list, href } = crumbs(subject);
	return (
		<>
			{/* Mobile: only a "‹ {név}" back link to the record's own page. */}
			<Breadcrumb
				mobileBack
				items={[
					list,
					{ label: subject.name, href },
					{ label: "Változástörténet" },
				]}
			/>
			<h1 className="text-2xl leading-8 font-bold">{subject.name}</h1>
		</>
	);
}

const LOGGED_TEXT: Record<HistorySubject["kind"], string> = {
	applicant:
		"A jelentkező és a jelentkezései mezőinek változását (régi → új érték), a duplikátumok összevonását és a törlést – a módosító Google-fiók nevével. Az automatikus változások „Rendszer” névvel jelennek meg.",
	event: "A program mezőinek változását (régi → új érték) – a módosító Google-fiók nevével. Az automatikus változások „Rendszer” névvel jelennek meg.",
};

export default async function HistoryPage({ params }: Props) {
	const { id } = await params;
	const subject = await load(id);
	if (!subject) notFound();

	const entries = await getHistoryEntries(subject, HISTORY_PAGE_LIMIT);
	const now = new Date();
	const groups = groupByDay(entries, now);
	const truncated = entries.length === HISTORY_PAGE_LIMIT;

	return (
		<PageShell className="pb-16">
			<HistoryHeader subject={subject} />

			<div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<section
					aria-label="Változások"
					className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-border-default bg-white p-4 shadow-card md:p-5"
				>
					{entries.length > 0 && (
						<p className="text-sm text-text-secondary">
							{truncated
								? `A legutóbbi ${formatCount(HISTORY_PAGE_LIMIT)} változás`
								: `${formatCount(entries.length)} változás`}
						</p>
					)}
					{groups.length === 0 ? (
						<p className="text-sm text-text-secondary">
							Még nincs rögzített változás
						</p>
					) : (
						groups.map((group) => (
							<div
								key={group.key}
								className="flex flex-col gap-3"
							>
								<h2 className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
									{group.label}
								</h2>
								<ol className="flex flex-col gap-4">
									{group.items.map((entry) => (
										<li
											key={entry.id}
											className="flex items-start gap-3 text-sm"
										>
											<span
												aria-hidden="true"
												className={cn(
													"flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
													entry.actor
														? programColorClass(
																entry.actor,
															)
														: "bg-surface-subtle",
												)}
											>
												{entry.actor
													? initials(entry.actor)
													: "R"}
											</span>
											<div className="flex min-w-0 grow flex-col gap-1.5">
												<div className="flex flex-wrap items-baseline justify-between gap-x-3">
													<HistoryChangeSummary
														kind={subject.kind}
														entry={entry}
													/>
													<time
														dateTime={entry.createdAt.toISOString()}
														className="font-mono text-xs text-text-tertiary"
													>
														{formatTime(
															entry.createdAt,
														)}
													</time>
												</div>
												<HistoryChangeDiff
													kind={subject.kind}
													entry={entry}
												/>
											</div>
										</li>
									))}
								</ol>
							</div>
						))
					)}
				</section>

				<aside className="flex min-w-0 flex-col gap-5">
					<DetailCard
						title={
							subject.kind === "applicant"
								? "Mit naplózunk a jelentkezőnél?"
								: "Mit naplózunk a programnál?"
						}
					>
						<p className="text-sm text-text-secondary">
							{LOGGED_TEXT[subject.kind]}
						</p>
					</DetailCard>
				</aside>
			</div>
		</PageShell>
	);
}
