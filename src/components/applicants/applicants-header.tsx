"use client";

import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCount } from "@/lib/applicants/format";

const SYNC_UNAVAILABLE = "A Google Sheet szinkronizálás még nem érhető el.";

export function ApplicantsHeader({
	total,
	onEmailList,
}: {
	/** `null`, amíg az első lekérés nem fejeződött be. */
	total: number | null;
	onEmailList: () => void;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div className="flex flex-col gap-1">
				<span className="font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
					Jelentkezők
				</span>
				<h1 className="text-2xl leading-8 font-bold">Jelentkezők</h1>
				<p className="text-sm text-text-secondary" aria-live="polite">
					Google Formból érkező jelentkezések
					{total !== null && <> · {formatCount(total)} fő</>}
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							{/* Disabled buttons get no pointer or focus events, so the
						    wrapper carries the tooltip trigger. */}
							<span tabIndex={0} className="rounded-full">
								<Button
									variant="ghost"
									disabled
									aria-describedby="sync-unavailable"
									className="rounded-full"
								>
									<RefreshCw aria-hidden="true" />
									Szinkronizálás
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>{SYNC_UNAVAILABLE}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<span id="sync-unavailable" className="sr-only">
					{SYNC_UNAVAILABLE}
				</span>
				<Button
					variant="surface"
					className="rounded-full"
					onClick={onEmailList}
				>
					<Copy aria-hidden="true" />
					E-mail lista
				</Button>
			</div>
		</div>
	);
}
