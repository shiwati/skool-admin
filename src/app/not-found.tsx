import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<main className="mx-auto max-w-xl space-y-4 px-6 py-16">
			<h1 className="text-2xl font-semibold">Page not found</h1>
			<Button asChild>
				<Link href="/">Return home</Link>
			</Button>
		</main>
	);
}
