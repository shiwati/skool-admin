import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Helyőrző a duplikáció-ellenőrzéshez (terv: 03.4). Még nincs mögötte
 * észlelés, ezért darabszámot sem állít.
 */
export function DuplicateBanner() {
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
					Lehetséges duplikált jelentkezések
				</span>
				<span className="text-xs">
					Ugyanarról az e-mail címről több jelentkezés is érkezhet.
					Ellenőrizd őket, mielőtt visszaigazolást küldesz. Az
					automatikus ellenőrzés hamarosan elérhető.
				</span>
			</div>
			<Button
				variant="surface"
				size="sm"
				disabled
				className="rounded-full"
				title="Hamarosan"
			>
				Ellenőrzés
			</Button>
		</div>
	);
}
