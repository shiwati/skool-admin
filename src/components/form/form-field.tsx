import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** A design szerinti űrlapmezők közös megjelenése (Input, Textarea, TagInput). */
export const fieldControlClass =
	"rounded-lg border-border-strong bg-white px-3.5 text-sm shadow-none focus-visible:border-ink focus-visible:ring-sky/70 aria-invalid:border-error-fg aria-invalid:ring-error-fg/15";

export type FieldControlProps = {
	id: string;
	"aria-invalid": true | undefined;
	"aria-describedby": string | undefined;
};

export function FormField({
	id,
	label,
	required,
	error,
	hint,
	className,
	children,
}: {
	id: string;
	label: string;
	required?: boolean;
	error?: string;
	hint?: string;
	className?: string;
	children: (control: FieldControlProps) => ReactNode;
}) {
	const messageId = useId();
	const describedBy = error || hint ? messageId : undefined;
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={id}>
				{label}
				{required && (
					<span aria-hidden="true" className="text-error-fg">
						{" "}
						*
					</span>
				)}
			</Label>
			{children({
				id,
				"aria-invalid": error ? true : undefined,
				"aria-describedby": describedBy,
			})}
			{error ? (
				<p
					id={messageId}
					className="flex items-center gap-1.5 text-xs text-error-fg"
				>
					<CircleAlert
						aria-hidden="true"
						className="size-3.5 shrink-0"
					/>
					{error}
				</p>
			) : (
				hint && (
					<p id={messageId} className="text-xs text-text-tertiary">
						{hint}
					</p>
				)
			)}
		</div>
	);
}
