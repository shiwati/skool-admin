import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "./kpi-card";

/**
 * Programonkénti elégedettség. A feedback beküldése még nincs kész, ezért
 * egyelőre üres állapotot mutat.
 */
export function SatisfactionCard() {
	return (
		<Card className="flex min-w-0 flex-col gap-4 p-5">
			<SectionHeader
				title="Elégedettség"
				subtitle="Feedback átlag (1–5) programonként"
			/>
			<div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
				<Star
					aria-hidden="true"
					className="size-6 text-text-tertiary"
				/>
				<p className="text-sm text-text-secondary">
					Még nincs beküldött visszajelzés.
				</p>
				<p className="max-w-xs text-xs text-text-tertiary">
					A programonkénti átlag a résztvevők visszajelzéseiből
					számolódik, amint a feedback beküldése elérhető lesz.
				</p>
			</div>
		</Card>
	);
}
