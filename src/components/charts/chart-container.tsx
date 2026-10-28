"use client";

import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function ChartContainer({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}) {
	return (
		<figure
			aria-label={label}
			className={cn("h-80 w-full min-w-0", className)}
		>
			<figcaption className="sr-only">{label}</figcaption>
			<ResponsiveContainer width="100%" height="100%">
				{children}
			</ResponsiveContainer>
		</figure>
	);
}
