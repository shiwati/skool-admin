import { Layers } from "lucide-react";

export default function Home() {
	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
			<Layers className="size-10" aria-hidden="true" />
			<h1 className="text-4xl font-semibold tracking-tight">
				Application foundation
			</h1>
			<p className="text-lg text-muted-foreground">
				The application skeleton is ready. Add application features when
				requirements are defined.
			</p>
		</main>
	);
}
