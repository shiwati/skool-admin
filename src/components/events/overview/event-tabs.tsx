"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCount } from "@/lib/applicants/format";
import { applicantsHref, eventHref } from "@/lib/events/links";
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

/**
 * A program szakaszai. A még nem létező képernyők letiltva jelennek meg
 * (ugyanígy, mint az oldalsáv menüpontjai).
 */
export function EventTabs({
	eventId,
	applications,
}: {
	eventId: string;
	applications: number;
}) {
	const pathname = usePathname();
	const overviewActive = pathname === eventHref(eventId);
	const feedbackActive = pathname === eventFeedbackHref(eventId);
	const disabled = ["Záró riport"];

	return (
		<nav aria-label="Program szakaszai" className="overflow-x-auto">
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
						href={applicantsHref(eventId)}
						className={cn(
							tabClass,
							"border-transparent text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
						)}
					>
						Jelentkezők
						<Count>{formatCount(applications)}</Count>
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
				{disabled.map((label) => (
					<li key={label}>
						<span
							aria-disabled="true"
							title="Hamarosan elérhető."
							className={cn(
								tabClass,
								"cursor-not-allowed border-transparent text-text-tertiary",
							)}
						>
							{label}
						</span>
					</li>
				))}
			</ul>
		</nav>
	);
}
