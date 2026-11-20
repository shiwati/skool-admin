import type { ReactNode } from "react";
import { EMPTY } from "@/lib/applicants/format";
import { cn } from "@/lib/utils";

/** Az adatlap kártyája (DS.2 card). */
export function DetailCard({
	title,
	subtitle,
	aside,
	children,
	className,
}: {
	title: string;
	subtitle?: ReactNode;
	aside?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex flex-col gap-4 rounded-[14px] border border-border-default bg-white p-5 shadow-card",
				className,
			)}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-base leading-6 font-semibold">
						{title}
					</h2>
					{subtitle && (
						<span className="text-sm text-text-tertiary">
							{subtitle}
						</span>
					)}
				</div>
				{aside}
			</div>
			{children}
		</section>
	);
}

export type KeyValue = { key: string; value: ReactNode };

/** Kulcs–érték lista; hiányzó (null/üres) értéknél „—”. */
export function KeyValueList({ items }: { items: KeyValue[] }) {
	return (
		// Mobile: one column with dividers (board 04.1 M); two columns from md.
		<dl className="grid grid-cols-1 divide-y divide-border-default text-sm md:grid-cols-2 md:gap-x-6 md:gap-y-3 md:divide-y-0">
			{items.map(({ key, value }) => (
				<div
					key={key}
					className="flex min-w-0 flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 md:py-0"
				>
					<dt className="text-text-tertiary">{key}</dt>
					<dd className="min-w-0 font-medium break-words">
						{value === null ||
						value === undefined ||
						value === "" ? (
							<span className="font-normal text-text-tertiary">
								{EMPTY}
							</span>
						) : (
							value
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** Kerek címke. */
export function Pill({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap text-text-primary",
				className,
			)}
		>
			{children}
		</span>
	);
}

/** `mailto:` link, vagy `null` (→ „—”). */
export function mailLink(value: string | null): ReactNode {
	if (!value) return null;
	return (
		<a
			className="underline-offset-2 hover:underline"
			href={`mailto:${value}`}
		>
			{value}
		</a>
	);
}

/** `tel:` link, vagy `null` (→ „—”). */
export function phoneLink(value: string | null): ReactNode {
	if (!value) return null;
	return (
		<a
			className="underline-offset-2 hover:underline"
			href={`tel:${value.replace(/[^\d+]/g, "")}`}
		>
			{value}
		</a>
	);
}
