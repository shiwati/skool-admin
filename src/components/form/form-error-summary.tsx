import { TriangleAlert } from "lucide-react";

export type ErrorSummaryItem = { name: string; label: string };

/** Beküldés utáni hibaösszegző: a linkek a hibás mezőre ugranak. */
export function FormErrorSummary({
	title,
	items,
	onSelect,
}: {
	title: string;
	items: ErrorSummaryItem[];
	onSelect: (name: string) => void;
}) {
	if (items.length === 0) return null;
	return (
		<div
			role="alert"
			className="flex items-start gap-3 rounded-[14px] bg-error-bg px-4 py-3 text-error-fg"
		>
			<TriangleAlert
				aria-hidden="true"
				className="mt-0.5 size-4 shrink-0"
			/>
			<div className="flex flex-col gap-0.5 text-sm">
				<p className="font-semibold">{title}</p>
				<ul className="flex flex-wrap gap-x-2 text-xs">
					{items.map((item, index) => (
						<li key={item.name}>
							<button
								type="button"
								onClick={() => onSelect(item.name)}
								className="underline underline-offset-2"
							>
								{item.label}
							</button>
							{index < items.length - 1 && " ·"}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
