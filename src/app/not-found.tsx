import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<main className="mx-auto max-w-xl space-y-4 px-6 py-16">
			<h1 className="text-2xl font-semibold">Az oldal nem található</h1>
			<p className="text-muted-foreground">
				Lehet, hogy az oldalt áthelyezték, vagy hibás a hivatkozás.
			</p>
			<Button asChild>
				<Link href="/">Vissza a kezdőlapra</Link>
			</Button>
		</main>
	);
}
