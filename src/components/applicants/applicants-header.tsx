"use client";

import { Copy } from "lucide-react";
import { PageHeader } from "@/components/admin-shell/page-header";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/applicants/format";

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
				<Button variant="surface" onClick={onEmailList}>
					<Copy aria-hidden="true" />
					E-mail lista
				</Button>
			}
		/>
	);
}
