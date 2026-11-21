"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

// Replaces the root layout when the layout itself fails, so it renders its own
// <html>/<body> and imports the global styles. Client Components cannot export
// `metadata`, hence the React <title>.
export default function GlobalError({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	useEffect(() => {
		console.error("Root layout rendering failed", error);
	}, [error]);

	return (
		<html lang="hu">
			<body className="min-h-screen bg-background font-sans text-foreground antialiased">
				<title>Hiba történt | SKOOL Menedzsment</title>
				<main className="mx-auto max-w-xl space-y-4 px-6 py-16">
					<h1 className="text-2xl font-semibold">Hiba történt</h1>
					<p className="text-muted-foreground">
						Az alkalmazást nem sikerült betölteni. Próbáld újra; ha
						a hiba megmarad, szólj a rendszer üzemeltetőjének.
					</p>
					<Button onClick={() => retry()}>Próbáld újra</Button>
				</main>
			</body>
		</html>
	);
}
