import { CircleAlert, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

/**
 * A lista hiba- és üres állapota; a táblázat (tablet/desktop) és a mobil
 * kártyalista is ezt használja, hogy a kettő ne térjen el.
 */
export function ListErrorState({ onReload }: { onReload: () => void }) {
	return (
		<EmptyState
			role="alert"
			icon={CircleAlert}
			tone="error"
			title="Nem sikerült betölteni a listát"
			description="Hálózati hiba, vagy a szerver nem válaszol. Próbáld újra."
			action={
				<Button variant="surface" size="sm" onClick={onReload}>
					Újratöltés
				</Button>
			}
		/>
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
		<EmptyState
			icon={SearchX}
			title="Nincs a szűrésnek megfelelő jelentkező"
			action={
				filtersActive && (
					<Button
						variant="surface"
						size="sm"
						onClick={onClearFilters}
					>
						Szűrők törlése
					</Button>
				)
			}
		/>
	);
}
