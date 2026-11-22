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
import { ALL_YEARS_LABEL } from "@/lib/dashboard/period";

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
					className="h-10 max-w-64 shrink-0 rounded-[10px]"
					aria-label={`${label}: ${current}`}
				>
					<span className="truncate">{current}</span>
					<ChevronDown aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				// Hosszú programnév se lógjon ki: korlátos szélesség, sortörés.
				className="max-h-80 w-max max-w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
			>
				<DropdownMenuRadioGroup value={value} onValueChange={onChange}>
					{options.map((option) => (
						<DropdownMenuRadioItem
							key={option.value}
							value={option.value}
							className="items-start [&>span:first-child]:top-2.5"
						>
							<span className="min-w-0 break-words">
								{option.label}
							</span>
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
		const params = new URLSearchParams();
		if (period) params.set("period", period);
		if (program) params.set("program", program);
		router.push(params.size ? `/?${params}` : "/");
	}

	return (
		<>
			<FilterMenu
				label="Időszak"
				current={
					data.year === null ? ALL_YEARS_LABEL : String(data.year)
				}
				value={data.year === null ? ALL : String(data.year)}
				options={[
					{ value: ALL, label: ALL_YEARS_LABEL },
					...data.years.map((y) => ({
						value: String(y),
						label: String(y),
					})),
				]}
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
				onChange={(program) =>
					navigate(
						data.year === null ? ALL : String(data.year),
						program,
					)
				}
			/>
		</>
	);
}
