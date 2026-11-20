import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Az admin oldalak közös tartalomkerete a layout `<main>` elemén belül.
 * Mobilon a `main` már helyet hagy az alsó navigációnak (`--shell-bottom`);
 * a nagy alsó padding desktopon a lebegő sávoknak kell.
 */
export function PageShell({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 px-4 pt-5 pb-24 md:gap-5 md:px-6 md:pt-6 md:pb-28 xl:px-8 xl:pt-7",
				className,
			)}
			{...props}
		/>
	);
}
