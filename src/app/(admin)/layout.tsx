import { requireAdmin } from "@/lib/session";

// Guards every page in the group. Route Handlers and Server Actions are not
// covered by layouts: they must call `getAdminSession()` themselves.
export default async function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	await requireAdmin("/");
	return children;
}
