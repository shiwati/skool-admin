import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Ismeretlen vagy törölt jelentkező (404). */
export default function ApplicantNotFound() {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 px-8 py-20 text-center">
			<h1 className="text-xl font-semibold">
				Nem található ilyen jelentkező
			</h1>
			<p className="text-sm text-text-secondary">
				Lehet, hogy a jelentkezőt törölték, vagy hibás a hivatkozás.
			</p>
			<Button asChild variant="surface" className="rounded-full">
				<Link href="/applicants">Jelentkezők</Link>
			</Button>
		</div>
	);
}
