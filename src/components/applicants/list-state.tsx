import { CircleAlert, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A lista hiba- és üres állapota; a táblázat (tablet/desktop) és a mobil
 * kártyalista is ezt használja, hogy a kettő ne térjen el.
 */
export function ListErrorState({ onReload }: { onReload: () => void }) {
	return (
		<div
			role="alert"
			className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center"
		>
			<span className="flex size-10 items-center justify-center rounded-full bg-error-bg text-error-fg">
				<CircleAlert aria-hidden="true" className="size-5" />
			</span>
			<h2 className="text-[15px] leading-[22px] font-semibold">
				Nem sikerült betölteni a listát
			</h2>
			<p className="text-xs text-text-secondary">
				Hálózati hiba, vagy a szerver nem válaszol. Próbáld újra.
			</p>
			<Button variant="surface" size="sm" onClick={onReload}>
				Újratöltés
			</Button>
		</div>
	);
}

export function ListEmptyState({
	filtersActive,
	onClearFilters,
}: {
	filtersActive: boolean;
	onClearFilters: () => void;
}) {
	return (
		<div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
			<span className="flex size-10 items-center justify-center rounded-full bg-sky-50">
				<SearchX aria-hidden="true" className="size-5" />
			</span>
			<h2 className="text-[15px] leading-[22px] font-semibold">
				Nincs a szűrésnek megfelelő jelentkező
			</h2>
			{filtersActive && (
				<Button variant="surface" size="sm" onClick={onClearFilters}>
					Szűrők törlése
				</Button>
			)}
		</div>
	);
}
