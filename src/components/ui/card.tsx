import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn(
				"rounded-[14px] border border-border-default bg-white shadow-card",
				className,
			)}
			{...props}
		/>
	);
}

export { Card };
