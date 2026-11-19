import type { ReactNode } from "react";

export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow?: string;
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div className="flex flex-col gap-1">
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
			{actions && (
				<div className="flex flex-wrap items-center gap-2">
					{actions}
				</div>
			)}
		</div>
	);
}
