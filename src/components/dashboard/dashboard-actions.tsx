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
import type { DashboardData, DashboardMode } from "@/lib/dashboard/load";
import { ALL_YEARS_LABEL } from "@/lib/dashboard/period";
import { Segmented } from "./segmented";

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

/**
 * Bontás (éves / program / cég) és a hozzá tartozó szűrő. Egyszerre egy bontás
 * aktív (URL-ben: `period`, `program` vagy `company`); váltáskor a másik kettő
 * törlődik, program- és cégbontásnál az első elem van kiválasztva.
 */
export function DashboardActions({ data }: { data: DashboardData }) {
	const router = useRouter();

	function navigate(key: "period" | "program" | "company", value: string) {
		router.push(value ? `/?${new URLSearchParams({ [key]: value })}` : "/");
	}

	function changeMode(mode: DashboardMode) {
		if (mode === "year") navigate("period", ALL);
		else if (mode === "program")
			navigate("program", data.programs[0]?.id ?? ALL);
		else navigate("company", data.companies[0] ?? ALL);
	}

	const modes: { value: DashboardMode; label: string }[] = [
		{ value: "year", label: "Éves" },
		...(data.programs.length
			? [{ value: "program" as const, label: "Program" }]
			: []),
		...(data.companies.length
			? [{ value: "company" as const, label: "Cég" }]
			: []),
	];

	return (
		<>
			<Segmented
				label="Bontás"
				options={modes}
				value={data.mode}
				onChange={changeMode}
				className="shrink-0 self-center"
			/>
			{data.mode === "year" && (
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
					onChange={(period) => navigate("period", period)}
				/>
			)}
			{data.mode === "program" && (
				<FilterMenu
					label="Program"
					current={data.program?.name ?? ""}
					value={data.program?.id ?? ALL}
					options={data.programs.map((p) => ({
						value: p.id,
						label: p.name,
					}))}
					onChange={(program) => navigate("program", program)}
				/>
			)}
			{data.mode === "company" && (
				<FilterMenu
					label="Cég"
					current={data.company ?? ""}
					value={data.company ?? ALL}
					options={data.companies.map((c) => ({
						value: c,
						label: c,
					}))}
					onChange={(company) => navigate("company", company)}
				/>
			)}
		</>
	);
}
