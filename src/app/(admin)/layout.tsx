import { AdminSidebar } from "@/components/admin-shell/admin-sidebar";
import { AdminTopbar } from "@/components/admin-shell/admin-topbar";
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

	return (
		<div className="grid min-h-screen grid-cols-[248px_minmax(0,1fr)] bg-canvas">
			<div className="sticky top-0 h-screen overflow-y-auto">
				<AdminSidebar />
			</div>
			<div className="flex min-w-0 flex-col">
				<AdminTopbar user={user} />
				<main className="flex-1">{children}</main>
			</div>
		</div>
	);
}
