import { AdminRail } from "@/components/admin-shell/admin-rail";
import { AdminSidebar } from "@/components/admin-shell/admin-sidebar";
import { AdminTopbar } from "@/components/admin-shell/admin-topbar";
import {
	MobileTabBar,
	MobileTopBar,
} from "@/components/admin-shell/mobile-nav";
import { headers } from "next/headers";
import { RETURN_TO_HEADER, returnToFromHeader } from "@/lib/return-to";
import { requireAdmin } from "@/lib/session";

// Guards every page in the group and renders the shared shell. Route Handlers
// and Server Actions are not covered by layouts: they must call
// `getAdminSession()` themselves.
export default async function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	// Return to the requested page after sign-in (path forwarded by proxy.ts).
	const returnTo = returnToFromHeader(
		(await headers()).get(RETURN_TO_HEADER),
	);
	const session = await requireAdmin(returnTo);
	const user = {
		name: session.user?.name ?? null,
		email: session.user?.email ?? null,
		image: session.user?.image ?? null,
	};

	// Breakpoints (docs/frontend.md): mobile < 768 px (top bar + bottom nav),
	// tablet `md` (80 px rail), desktop `xl` (248 px sidebar). Only one
	// "Főmenü" navigation is displayed per range; the others are display:none.
	// `--shell-left` / `--shell-bottom` position floating bars and buttons.
	return (
		<div
			data-testid="admin-shell"
			className="min-h-screen bg-canvas [--shell-bottom:calc(72px+env(safe-area-inset-bottom))] [--shell-left:0px] md:grid md:grid-cols-[80px_minmax(0,1fr)] md:[--shell-bottom:0px] md:[--shell-left:80px] xl:grid-cols-[248px_minmax(0,1fr)] xl:[--shell-left:248px]"
		>
			<MobileTopBar user={user} className="md:hidden" />
			<div className="sticky top-0 hidden h-screen overflow-y-auto md:block">
				<AdminRail className="xl:hidden" />
				<AdminSidebar className="hidden xl:flex" />
			</div>
			{/* overflow-x-clip: nothing may widen the page (unlike hidden, it
			    keeps sticky elements working). Mobile: room for the fixed top bar. */}
			<div className="flex min-w-0 flex-col overflow-x-clip pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
				<AdminTopbar user={user} className="hidden md:flex" />
				<main className="flex-1 pb-[var(--shell-bottom)]">
					{children}
				</main>
			</div>
			<MobileTabBar className="md:hidden" />
		</div>
	);
}
