"use client";

import { ChevronDown, ChevronUp, Columns3, GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	defaultColumnSettings,
	moveColumn,
	setColumnVisible,
	type ColumnSettings,
	type ColumnSettingsConfig,
} from "@/lib/column-settings";
import { cn } from "@/lib/utils";

/** Amit a panel egy oszlopról tud. */
export type PickerColumn = { pickerLabel: string; locked?: boolean };

const iconButton =
	"flex size-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-30";

/**
 * Az „Oszlopok a listában” panel bármelyik listához. `compact` (mobil):
 * 44 px-es ikongomb a szöveges gomb helyett; a panel ugyanaz, a képernyőhöz
 * szűkítve.
 */
export function ColumnPicker<Id extends string>({
	config,
	columns,
	settings,
	onChange,
	compact = false,
}: {
	config: ColumnSettingsConfig<Id>;
	columns: Record<Id, PickerColumn>;
	settings: ColumnSettings<Id>;
	onChange: (settings: ColumnSettings<Id>) => void;
	compact?: boolean;
}) {
	const [dragged, setDragged] = useState<Id | null>(null);
	const [dropTarget, setDropTarget] = useState<Id | null>(null);

	return (
		<Popover>
			<PopoverTrigger asChild>
				{compact ? (
					<button
						type="button"
						aria-label="Oszlopok"
						className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
					>
						<Columns3 aria-hidden="true" className="size-[18px]" />
					</button>
				) : (
					<Button variant="ghost" size="sm">
						<Columns3 aria-hidden="true" />
						Oszlopok
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				aria-label="Oszlopok a listában"
				className="w-[min(300px,calc(100vw-2rem))] rounded-[14px] p-3 shadow-overlay"
			>
				<div className="flex flex-col gap-0.5 px-1.5 pt-1 pb-2">
					<h2 className="text-[15px] leading-[22px] font-semibold">
						Oszlopok a listában
					</h2>
					<p className="text-xs text-text-tertiary">
						Húzással vagy a nyilakkal rendezhető · ebben a
						böngészőben mentődik
					</p>
				</div>
				<ul className="flex flex-col gap-0.5">
					{settings.order.map((id, index) => {
						const column = columns[id];
						const visible = !settings.hidden.includes(id);
						return (
							<li
								key={id}
								draggable
								onDragStart={(e) => {
									setDragged(id);
									e.dataTransfer.effectAllowed = "move";
								}}
								onDragOver={(e) => {
									if (!dragged) return;
									e.preventDefault();
									setDropTarget(id);
								}}
								onDragLeave={() => setDropTarget(null)}
								onDrop={(e) => {
									e.preventDefault();
									if (dragged && dragged !== id) {
										onChange(
											moveColumn(
												settings,
												dragged,
												index,
											),
										);
									}
									setDragged(null);
									setDropTarget(null);
								}}
								onDragEnd={() => {
									setDragged(null);
									setDropTarget(null);
								}}
								className={cn(
									"flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs",
									dropTarget === id &&
										dragged !== id &&
										"bg-sky-50",
									dragged === id && "opacity-50",
								)}
							>
								<GripVertical
									aria-hidden="true"
									className="size-3.5 cursor-grab text-text-tertiary"
								/>
								<label className="flex flex-1 items-center gap-2.5">
									<Checkbox
										checked={visible}
										disabled={column.locked}
										onCheckedChange={(checked) =>
											onChange(
												setColumnVisible(
													config,
													settings,
													id,
													checked === true,
												),
											)
										}
									/>
									<span
										className={
											visible
												? "text-text-primary"
												: "text-text-secondary"
										}
									>
										{column.pickerLabel}
									</span>
								</label>
								<button
									type="button"
									className={iconButton}
									aria-label={`${column.pickerLabel} feljebb`}
									disabled={index === 0}
									onClick={() =>
										onChange(
											moveColumn(settings, id, index - 1),
										)
									}
								>
									<ChevronUp
										aria-hidden="true"
										className="size-3.5"
									/>
								</button>
								<button
									type="button"
									className={iconButton}
									aria-label={`${column.pickerLabel} lejjebb`}
									disabled={
										index === settings.order.length - 1
									}
									onClick={() =>
										onChange(
											moveColumn(settings, id, index + 1),
										)
									}
								>
									<ChevronDown
										aria-hidden="true"
										className="size-3.5"
									/>
								</button>
							</li>
						);
					})}
				</ul>
				<div className="mt-1 border-t border-border-default px-1.5 pt-2.5">
					<button
						type="button"
						className="text-xs font-medium text-info-fg hover:underline"
						onClick={() => onChange(defaultColumnSettings(config))}
					>
						Alapértelmezés visszaállítása
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
