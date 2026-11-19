import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "ok" | "warn" | "alert" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
	ok: "bg-success-bg text-success-fg",
	warn: "bg-warning-bg text-warning-fg",
	alert: "bg-error-bg text-error-fg",
	info: "bg-info-bg text-info-fg",
	neutral: "bg-surface-subtle text-text-secondary",
};

/** Túljelentkezés színezése: ≥2× erős, ≥1× telt ház, alatta van szabad hely. */
export function ratioTone(ratio: number | null): Tone {
	if (ratio === null) return "neutral";
	if (ratio >= 2) return "alert";
	if (ratio >= 1) return "warn";
	return "ok";
}

export function StatBadge({
	tone = "neutral",
	className,
	children,
}: {
	tone?: Tone;
	className?: string;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-mono text-xs font-medium whitespace-nowrap",
				toneClass[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
