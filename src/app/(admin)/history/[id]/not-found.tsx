import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Ismeretlen (vagy törölt) jelentkező vagy program változásnaplója (404). */
export default function HistoryNotFound() {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 px-8 py-20 text-center">
			<h1 className="text-xl font-semibold">
				Nem található ilyen változásnapló
			</h1>
			<p className="text-sm text-text-secondary">
				Lehet, hogy a jelentkezőt vagy a programot törölték, vagy hibás
				a hivatkozás.
			</p>
			<div className="flex gap-2">
				<Button asChild variant="surface" className="rounded-full">
					<Link href="/applicants">Jelentkezők</Link>
				</Button>
				<Button asChild variant="surface" className="rounded-full">
					<Link href="/events">Programok</Link>
				</Button>
			</div>
		</div>
	);
}
