import type { ReactNode } from "react";

/**
 * Oldalfejléc. A műveletek nem férnek el a cím mellett → a cím alá kerülnek.
 * `mobileActions` esetén mobilon (`md` alatt) az `actions` helyett ez
 * látszik a cím mellett (pl. egy „További műveletek” menü).
 */
export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
	mobileActions,
}: {
	eyebrow?: string;
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	mobileActions?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{eyebrow && (
					<span className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
						{eyebrow}
					</span>
				)}
				<h1 className="text-2xl leading-8 font-bold">{title}</h1>
				{description && (
					<p
						className="text-sm text-text-secondary"
						aria-live="polite"
					>
						{description}
					</p>
				)}
			</div>
			{mobileActions && (
				<div
					data-testid="page-header-mobile-actions"
					className="flex shrink-0 items-center gap-2 md:hidden"
				>
					{mobileActions}
				</div>
			)}
			{actions && (
				<div
					className={
						mobileActions
							? "hidden flex-wrap items-center gap-2 md:flex"
							: "flex w-full flex-wrap items-center gap-2 md:w-auto"
					}
				>
					{actions}
				</div>
			)}
		</div>
	);
}
