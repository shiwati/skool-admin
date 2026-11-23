"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	createContext,
	useContext,
	useTransition,
	type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Ctx = { pending: boolean; navigate: (href: string) => void };

const PendingContext = createContext<Ctx>({
	pending: false,
	navigate: () => {},
});

/** A szűrőváltás navigációját tranzícióba teszi, hogy a töltés állapota látszódjon. */
export function DashboardPendingProvider({
	children,
}: {
	children: ReactNode;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const navigate = (href: string) =>
		startTransition(() => {
			router.push(href);
		});
	return (
		<PendingContext.Provider value={{ pending, navigate }}>
			{children}
		</PendingContext.Provider>
	);
}

export const useDashboardPending = () => useContext(PendingContext);

/** Töltés közben elhalványítja és letiltja a tartalmat. */
export function PendingContent({ children }: { children: ReactNode }) {
	const { pending } = useDashboardPending();
	return (
		<div
			aria-busy={pending}
			className={cn(
				"flex flex-col gap-4 transition-opacity duration-200 md:gap-5",
				pending && "pointer-events-none opacity-50",
			)}
		>
			{children}
		</div>
	);
}

export function PendingSpinner() {
	const { pending } = useDashboardPending();
	if (!pending) return null;
	return (
		<span role="status" className="flex shrink-0 items-center self-center">
			<Loader2
				aria-hidden="true"
				className="size-5 animate-spin text-muted-foreground"
			/>
			<span className="sr-only">Betöltés…</span>
		</span>
	);
}
