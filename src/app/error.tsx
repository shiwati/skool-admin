"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Application rendering failed", error);
	}, [error]);

	return (
		<main className="mx-auto max-w-xl space-y-4 px-6 py-16">
			<h1 className="text-2xl font-semibold">Something went wrong</h1>
			<p className="text-muted-foreground">
				Please try again. If the problem persists, contact support.
			</p>
			<Button onClick={reset}>Try again</Button>
		</main>
	);
}
