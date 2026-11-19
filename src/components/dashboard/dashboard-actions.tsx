"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardData } from "@/lib/dashboard/load";

const ALL = "";

function FilterMenu({
	label,
	current,
	value,
	options,
	onChange,
}: {
	/** Képernyőolvasónak: mit szűr a menü. */
	label: string;
	current: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="surface"
					className="h-10 max-w-64 rounded-[10px]"
					aria-label={`${label}: ${current}`}
				>
					<span className="truncate">{current}</span>
					<ChevronDown aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="max-h-80 overflow-y-auto"
			>
				<DropdownMenuRadioGroup value={value} onValueChange={onChange}>
					{options.map((option) => (
						<DropdownMenuRadioItem
							key={option.value}
							value={option.value}
						>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** Időszak- és programszűrő (URL-ben: `period`, `program`). */
export function DashboardActions({ data }: { data: DashboardData }) {
	const router = useRouter();

	function navigate(period: string, program: string) {
		const params = new URLSearchParams({ period });
		if (program) params.set("program", program);
		router.push(`/?${params}`);
	}

	return (
		<>
			<FilterMenu
				label="Időszak"
				current={data.period.label}
				value={data.period.key}
				options={data.periodOptions.map((o) => ({
					value: o.key,
					label: o.label,
				}))}
				// Másik időszakban más programok vannak: a programszűrő törlődik.
				onChange={(period) => navigate(period, ALL)}
			/>
			<FilterMenu
				label="Program"
				current={data.program?.name ?? "Összes program"}
				value={data.program?.id ?? ALL}
				options={[
					{ value: ALL, label: "Összes program" },
					...data.programs.map((p) => ({
						value: p.id,
						label: p.name,
					})),
				]}
				onChange={(program) => navigate(data.period.key, program)}
			/>
		</>
	);
}
