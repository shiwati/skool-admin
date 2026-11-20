"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCount } from "@/lib/applicants/format";
import {
	eventApplicantsHref,
	eventHref,
	eventReportHref,
} from "@/lib/events/links";
import { eventFeedbackHref } from "@/lib/feedback/format";
import { cn } from "@/lib/utils";

const tabClass =
	"-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap";

function Count({ children, active }: { children: string; active?: boolean }) {
	return (
		<span
			className={cn(
				"rounded-full px-2 font-mono text-[11px] leading-5",
				active
					? "bg-ink text-white"
					: "bg-surface-subtle text-text-secondary",
			)}
		>
			{children}
		</span>
	);
}

/** A program szakaszai. */
export function EventTabs({
	eventId,
	applications,
}: {
	eventId: string;
	applications: number;
}) {
	const pathname = usePathname();
	const overviewActive = pathname === eventHref(eventId);
	const applicantsActive = pathname === eventApplicantsHref(eventId);
	const feedbackActive = pathname === eventFeedbackHref(eventId);
	const reportActive = pathname === eventReportHref(eventId);

	return (
		<nav
			aria-label="Program szakaszai"
			// Mobile: edge-to-edge horizontal scroll (positioned, see docs/frontend.md).
			className="relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
		>
			{/* A keret a listán van: a fülek `-mb-px` túllógása így nem a
			    görgethető konténeren belül történik (különben függőleges
			    görgetősáv jelenne meg). */}
			<ul className="flex min-w-max gap-1 border-b border-border-default">
				<li>
					<Link
						href={eventHref(eventId)}
						aria-current={overviewActive ? "page" : undefined}
						className={cn(
							tabClass,
							"focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							overviewActive
								? "border-ink text-text-primary"
								: "border-transparent text-text-secondary hover:text-text-primary",
						)}
					>
						Áttekintés
					</Link>
				</li>
				<li>
					<Link
						href={eventApplicantsHref(eventId)}
						aria-current={applicantsActive ? "page" : undefined}
						className={cn(
							tabClass,
							"focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							applicantsActive
								? "border-ink text-text-primary"
								: "border-transparent text-text-secondary hover:text-text-primary",
						)}
					>
						Jelentkezők
						<Count active={applicantsActive}>
							{formatCount(applications)}
						</Count>
					</Link>
				</li>
				<li>
					<Link
						href={eventFeedbackHref(eventId)}
						aria-current={feedbackActive ? "page" : undefined}
						className={cn(
							tabClass,
							"focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							feedbackActive
								? "border-ink text-text-primary"
								: "border-transparent text-text-secondary hover:text-text-primary",
						)}
					>
						Visszajelzések
					</Link>
				</li>
				<li>
					<Link
						href={eventReportHref(eventId)}
						aria-current={reportActive ? "page" : undefined}
						className={cn(
							tabClass,
							"focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
							reportActive
								? "border-ink text-text-primary"
								: "border-transparent text-text-secondary hover:text-text-primary",
						)}
					>
						Záró riport
					</Link>
				</li>
			</ul>
		</nav>
	);
}
