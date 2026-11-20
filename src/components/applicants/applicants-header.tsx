"use client";

import { Copy } from "lucide-react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/applicants/format";

export function ApplicantsHeader({
	total,
	filtered = false,
	onEmailList,
}: {
	/** `null`, amíg az első lekérés nem fejeződött be. */
	total: number | null;
	/** Szűrt állapotban a szám a találatok száma, nem az összes profilé. */
	filtered?: boolean;
	onEmailList: () => void;
}) {
	return (
		<PageHeader
			eyebrow="Jelentkezők"
			title="Jelentkezők"
			description={
				total !== null &&
				`${filtered ? "Találatok száma" : "Összes jelentkező"}: ${formatCount(total)} fő`
			}
			actions={
				<Button variant="surface" onClick={onEmailList}>
					<Copy aria-hidden="true" />
					E-mail lista
				</Button>
			}
		/>
	);
}
