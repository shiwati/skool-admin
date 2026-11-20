"use client";

import { Check, ChevronDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/applicants/format";
import type { ApplicationStatus } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";

export const STATUS_OPTIONS: ApplicationStatus[] = [
	"ACCEPTED",
	"WAITLISTED",
	"REJECTED",
	"ATTENDED",
	"APPLIED",
];

/** Státusz-címke, amelyre kattintva legördülő listából másik státusz választható. */
export function StatusCell({
	name,
	status,
	disabled,
	onChange,
}: {
	name: string;
	status: ApplicationStatus;
	disabled?: boolean;
	onChange: (status: ApplicationStatus) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={disabled}
				aria-label={`${name} státusza: ${STATUS_LABELS[status]}. Módosítás`}
				className={cn(
					"inline-flex items-center gap-1 rounded-full py-0 pr-1.5 pl-2.5 text-xs leading-6 font-medium whitespace-nowrap disabled:opacity-60",
					STATUS_BADGE_CLASSES[status],
				)}
			>
				{STATUS_LABELS[status]}
				<ChevronDown aria-hidden="true" className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{STATUS_OPTIONS.map((option) => (
					<DropdownMenuItem
						key={option}
						disabled={option === status}
						onSelect={() => onChange(option)}
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-2.5 rounded-full",
								STATUS_BADGE_CLASSES[option],
							)}
						/>
						{STATUS_LABELS[option]}
						{option === status && (
							<Check
								aria-hidden="true"
								className="ml-auto size-4"
							/>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
