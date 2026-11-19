import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/applicants/format";

/**
 * Figyelmeztetés az eldöntetlen duplikátumpárokról (terv: 03.4). Nulla
 * párnál (vagy amíg a szám nem ismert) nem jelenik meg.
 */
export function DuplicateBanner({
	count,
	onReview,
}: {
	count: number | null;
	onReview: () => void;
}) {
	if (!count) return null;
	return (
		<div
			role="status"
			className="flex flex-wrap items-center gap-3 rounded-[14px] bg-warning-bg px-4 py-3 text-warning-fg"
		>
			<TriangleAlert
				aria-hidden="true"
				className="size-[18px] shrink-0"
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-sm font-medium">
					{formatCount(count)} lehetséges duplikált jelentkezés
				</span>
				<span className="text-xs">
					Azonos névvel és e-mail címmel több jelentkező is van.
					Ellenőrizd őket, mielőtt visszaigazolást küldesz.
				</span>
			</div>
			<Button variant="surface" size="sm" onClick={onReview}>
				Ellenőrzés
			</Button>
		</div>
	);
}
