"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, apiErrorMessage, apiFetch } from "@/lib/api/client";

const SYNC_FAILED = "A szinkronizálás nem sikerült. Próbáld újra.";

/**
 * „Szinkronizálás most” gomb: `POST url`, siker után toast a
 * `successMessage` szövegével, `onSynced`, majd a szerveroldali adatok
 * frissítése. Hibánál a szerver magyar üzenete, ismeretlen válasznál
 * általános szöveg.
 */
export function SyncButton<T>({
	url,
	successMessage,
	onSynced,
	className,
	title,
}: {
	url: string;
	successMessage: (result: T) => string;
	onSynced?: () => void;
	className?: string;
	title?: string;
}) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function sync() {
		if (pending) return;
		setPending(true);
		try {
			const result = await apiFetch<T>(url, { method: "POST" });
			toast.success(successMessage(result));
			onSynced?.();
			router.refresh();
		} catch (error) {
			// 401: apiFetch is already redirecting to the login page.
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(apiErrorMessage(error, SYNC_FAILED));
		} finally {
			setPending(false);
		}
	}

	return (
		<Button
			variant="surface"
			className={className}
			disabled={pending}
			aria-busy={pending || undefined}
			title={title}
			onClick={() => void sync()}
		>
			<RefreshCw
				aria-hidden="true"
				className={pending ? "animate-spin" : undefined}
			/>
			Szinkronizálás most
		</Button>
	);
}
