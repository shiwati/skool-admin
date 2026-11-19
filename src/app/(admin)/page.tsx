import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function Home() {
	const session = await requireAdmin("/");
	const name = session.user?.name ?? session.user?.email ?? "admin";

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-16">
			<p className="font-mono text-sm text-text-secondary">
				SKOOL Menedzsment
			</p>
			<h1 className="text-4xl font-semibold tracking-tight">
				Szia, {name}!
			</h1>
			<p className="text-lg text-text-secondary">
				Az áttekintő oldal hamarosan elkészül. Addig a jelentkezőket a{" "}
				<Link href="/applicants" className="font-medium underline">
					Jelentkezők
				</Link>{" "}
				oldalon találod.
			</p>
		</div>
	);
}
