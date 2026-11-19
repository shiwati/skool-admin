import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary/90",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				// Destructive confirmation (design S01 "btn-d").
				destructive: "bg-error-fg text-white hover:bg-error-fg/90",
				// Skool "secondary" button (design C02/L01): white surface, strong border.
				surface:
					"border border-border-strong bg-white text-text-primary hover:bg-sky-50 focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-sky/70 disabled:border-border-default disabled:bg-surface-subtle disabled:text-text-tertiary disabled:opacity-100",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 px-3 text-xs",
				icon: "size-9",
				// Full-width 44px pill for primary page actions such as the login CTA.
				pill: "h-11 w-full rounded-full px-[18px] font-mono text-[13px] leading-4 [&_svg]:size-[18px]",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
