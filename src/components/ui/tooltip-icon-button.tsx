"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = Omit<React.ComponentProps<typeof Button>, "size" | "asChild"> & {
	label: string;
};

/** Icon-only button: `label` is the accessible name and the hover/focus tooltip. */
function TooltipIconButton({ label, children, ...props }: Props) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon" aria-label={label} {...props}>
						{children}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export { TooltipIconButton };
