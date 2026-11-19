import * as React from "react";
import { cn } from "@/lib/utils";

/** Az admin oldalak közös tartalomkerete a layout `<main>` elemén belül. */
export function PageShell({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-5 px-8 pt-7 pb-28", className)}
			{...props}
		/>
	);
}
