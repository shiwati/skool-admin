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
	DEFAULT_COLUMN_SETTINGS,
	moveColumn,
	setColumnVisible,
	type ColumnId,
	type ColumnSettings,
} from "@/lib/applicants/column-settings";
import { cn } from "@/lib/utils";
import { COLUMNS } from "./columns";

const iconButton =
	"flex size-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-30";

export function ColumnPicker({
	settings,
	onChange,
}: {
	settings: ColumnSettings;
	onChange: (settings: ColumnSettings) => void;
}) {
	const [dragged, setDragged] = useState<ColumnId | null>(null);
	const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm">
					<Columns3 aria-hidden="true" />
					Oszlopok
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				aria-label="Oszlopok a listában"
				className="w-[300px] rounded-[14px] p-3 shadow-overlay"
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
						const column = COLUMNS[id];
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
						onClick={() =>
							onChange(structuredClone(DEFAULT_COLUMN_SETTINGS))
						}
					>
						Alapértelmezés visszaállítása
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
