import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ICON_TONES = {
	info: "bg-sky-50",
	neutral: "bg-surface-subtle text-text-secondary",
	error: "bg-error-bg text-error-fg",
} as const;

/**
 * A listák üres és hibaállapota: ikon körben, cím, opcionális leírás és
 * művelet. Minden lista (tábla, kártyalista) ezt használja.
 */
export function EmptyState({
	icon: Icon,
	tone = "info",
	title,
	description,
	action,
	role,
	className,
}: {
	icon: LucideIcon;
	tone?: keyof typeof ICON_TONES;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	role?: "alert" | "status";
	className?: string;
}) {
	return (
		<div
			role={role}
			className={cn(
				"mx-auto flex max-w-sm flex-col items-center gap-2 text-center",
				className,
			)}
		>
			<span
				className={cn(
					"flex size-10 items-center justify-center rounded-full",
					ICON_TONES[tone],
				)}
			>
				<Icon aria-hidden="true" className="size-5" />
			</span>
			<h2 className="text-[15px] leading-[22px] font-semibold">
				{title}
			</h2>
			{description && (
				<p className="text-xs text-text-secondary">{description}</p>
			)}
			{action}
		</div>
	);
}
