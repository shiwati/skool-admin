"use client";

import { Copy, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin-shell/page-header";
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
		<PageHeader
			eyebrow="Jelentkezők"
			title="Jelentkezők"
			description={
				<>
					Google Formból érkező jelentkezések
					{total !== null && <> · {formatCount(total)} fő</>}
				</>
			}
			actions={
				<>
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
				</>
			}
		/>
	);
}
