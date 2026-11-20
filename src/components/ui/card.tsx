import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn(
				// `relative`: absolutely positioned descendants (sr-only text,
				// Radix hidden inputs) stay inside the card's overflow clip.
				"relative rounded-[14px] border border-border-default bg-white shadow-card",
				className,
			)}
			{...props}
		/>
	);
}

export { Card };
