"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// `retry()` (stable since Next 16.3) re-fetches the server-rendered segment and
// re-renders it, so a transient server error (e.g. the DB) can recover.
// `reset()` would only re-render on the client and show the same error again.
export default function ErrorBoundary({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	useEffect(() => {
		console.error("Application rendering failed", error);
	}, [error]);

	return (
		<main className="mx-auto max-w-xl space-y-4 px-6 py-16">
			<h1 className="text-2xl font-semibold">Hiba történt</h1>
			<p className="text-muted-foreground">
				Az oldalt nem sikerült betölteni. Próbáld újra; ha a hiba
				megmarad, szólj a rendszer üzemeltetőjének.
			</p>
			<Button onClick={() => retry()}>Próbáld újra</Button>
		</main>
	);
}
