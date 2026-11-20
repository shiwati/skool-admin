import type { ReactNode } from "react";
import type { Recommend } from "@/lib/feedback/questions";
import { cn } from "@/lib/utils";

const CLASSES: Record<Recommend, string> = {
	yes: "bg-success-bg text-success-fg",
	maybe: "bg-warning-bg text-warning-fg",
	no: "bg-error-bg text-error-fg",
};

/** Az „Ajánlaná” válasz címkéje (Igen zöld, Talán sárga, Nem piros). */
export function RecommendBadge({
	value,
	children,
}: {
	value: Recommend;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap",
				CLASSES[value],
			)}
		>
			{children}
		</span>
	);
}
